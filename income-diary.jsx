import React, { useState, useEffect, useMemo, useRef } from "react";
import { Trash2, ChevronLeft, ChevronRight, Sparkles, Wallet, CalendarDays } from "lucide-react";

const FONT_IMPORT_ID = "income-diary-font";

const CATEGORIES = [
  { key: "A", label: "A", color: "#FF6FA5", soft: "#FFE3EE" },
  { key: "B", label: "B", color: "#22C39A", soft: "#DCF8EF" },
  { key: "C", label: "C", color: "#FFB100", soft: "#FFF1D1" },
  { key: "その他", label: "その他", color: "#9B7EDE", soft: "#ECE3FB" },
];

const catInfo = (key) => CATEGORIES.find((c) => c.key === key) || CATEGORIES[3];

const JELLY_MESSAGES = [
  "なち、おつかれさま",
  "なち、今日も頑張ったね",
  "明日もがんばろう",
  "なち、お腹すいた？",
  "お金貯まったら何しよう？",
  "なち、なち、なち、なち",
  "あたらしい服買う？",
  "焼き鳥りりあ行く？",
  "焼肉食べたい",
  "僕、クラゲなんよ",
];

function todayStr() {
  const d = new Date();
  const tz = d.getTimezoneOffset() * 60000;
  return new Date(d - tz).toISOString().slice(0, 10);
}

function monthStr(dateStr) {
  return dateStr.slice(0, 7);
}

function yearStr(dateStr) {
  return dateStr.slice(0, 4);
}

function formatYen(n) {
  return "¥" + Number(n || 0).toLocaleString("ja-JP");
}

function formatDateLabel(dateStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  const wd = ["日", "月", "火", "水", "木", "金", "土"][dt.getDay()];
  return `${m}月${d}日（${wd}）`;
}

function shiftMonth(monthKey, delta) {
  const [y, m] = monthKey.split("-").map(Number);
  const dt = new Date(y, m - 1 + delta, 1);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(monthKey) {
  const [y, m] = monthKey.split("-").map(Number);
  return `${y}年${m}月`;
}

// --- Mascot: きらきらクラゲ貯金箱 ---
function JellyMascot({ pct, celebrate, speech }) {
  const clamped = Math.max(4, Math.min(100, pct));
  return (
    <div className="jelly-wrap">
      {speech && <div className="speech-bubble show">{speech}</div>}
      <div className={"jelly-blob" + (celebrate ? " jelly-pop" : "")}>
        <div className="jelly-liquid" style={{ height: `${clamped}%` }}>
          <div className="wave wave1" />
          <div className="wave wave2" />
        </div>
        <div className="bubble b1" />
        <div className="bubble b2" />
        <div className="bubble b3" />
        <div className="jelly-face">
          <div className="eye eye-l" />
          <div className="eye eye-r" />
          <div className="mouth" />
        </div>
        <div className="tentacle t1" />
        <div className="tentacle t2" />
        <div className="tentacle t3" />
        <div className="tentacle t4" />
      </div>
      {celebrate && (
        <div className="confetti">
          {Array.from({ length: 14 }).map((_, i) => (
            <span
              key={i}
              className="confetti-piece"
              style={{
                left: `${8 + Math.random() * 84}%`,
                animationDelay: `${Math.random() * 0.15}s`,
                background: CATEGORIES[i % CATEGORIES.length].color,
                transform: `rotate(${Math.random() * 360}deg)`,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function IncomeDiary() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [tab, setTab] = useState("input"); // input | history | summary
  const [celebrate, setCelebrate] = useState(false);
  const [speech, setSpeech] = useState("");
  const speechTimer = useRef(null);

  const [date, setDate] = useState(todayStr());
  const [category, setCategory] = useState("A");
  const [amount, setAmount] = useState("");
  const [memo, setMemo] = useState("");
  const [saving, setSaving] = useState(false);
  const [historyMonth, setHistoryMonth] = useState(monthStr(todayStr()));
  const [summaryYear, setSummaryYear] = useState(yearStr(todayStr()));
  const celebrateTimer = useRef(null);

  // inject rounded font once
  useEffect(() => {
    if (!document.getElementById(FONT_IMPORT_ID)) {
      const style = document.createElement("style");
      style.id = FONT_IMPORT_ID;
      style.textContent = `@import url('https://fonts.googleapis.com/css2?family=M+PLUS+Rounded+1c:wght@400;500;700;800&display=swap');`;
      document.head.appendChild(style);
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const res = await window.storage.get("income-entries", false);
        if (res && res.value) {
          setEntries(JSON.parse(res.value));
        }
      } catch (e) {
        setLoadError(true);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function persist(next) {
    setEntries(next);
    try {
      await window.storage.set("income-entries", JSON.stringify(next), false);
    } catch (e) {
      setLoadError(true);
    }
  }

  const todayTotal = useMemo(
    () => entries.filter((e) => e.date === todayStr()).reduce((s, e) => s + Number(e.amount), 0),
    [entries]
  );

  const thisMonthTotal = useMemo(
    () =>
      entries
        .filter((e) => monthStr(e.date) === monthStr(todayStr()))
        .reduce((s, e) => s + Number(e.amount), 0),
    [entries]
  );

  const historyMonthTotal = useMemo(
    () =>
      entries
        .filter((e) => monthStr(e.date) === historyMonth)
        .reduce((s, e) => s + Number(e.amount), 0),
    [entries]
  );

  const historyGroups = useMemo(() => {
    const inMonth = entries.filter((e) => monthStr(e.date) === historyMonth);
    const byDate = {};
    inMonth.forEach((e) => {
      if (!byDate[e.date]) byDate[e.date] = [];
      byDate[e.date].push(e);
    });
    return Object.keys(byDate)
      .sort((a, b) => (a < b ? 1 : -1))
      .map((d) => ({
        date: d,
        entries: byDate[d].sort((a, b) => b.createdAt - a.createdAt),
        total: byDate[d].reduce((s, e) => s + Number(e.amount), 0),
      }));
  }, [entries, historyMonth]);

  const yearTotal = useMemo(
    () =>
      entries
        .filter((e) => yearStr(e.date) === summaryYear)
        .reduce((s, e) => s + Number(e.amount), 0),
    [entries, summaryYear]
  );

  const monthsInYear = useMemo(() => {
    const list = [];
    for (let m = 1; m <= 12; m++) {
      const key = `${summaryYear}-${String(m).padStart(2, "0")}`;
      const monthEntries = entries.filter((e) => monthStr(e.date) === key);
      list.push({
        key,
        m,
        total: monthEntries.reduce((s, e) => s + Number(e.amount), 0),
        count: monthEntries.length,
      });
    }
    return list;
  }, [entries, summaryYear]);

  async function handleAdd() {
    const amt = Number(amount);
    if (!date || !amt || amt <= 0 || saving) return;
    setSaving(true);
    const entry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      date,
      category,
      amount: amt,
      memo: memo.trim(),
      createdAt: Date.now(),
    };
    const next = [entry, ...entries];
    await persist(next);
    setAmount("");
    setMemo("");
    setSaving(false);
    setCelebrate(true);
    clearTimeout(celebrateTimer.current);
    celebrateTimer.current = setTimeout(() => setCelebrate(false), 900);
    setSpeech(JELLY_MESSAGES[Math.floor(Math.random() * JELLY_MESSAGES.length)]);
    clearTimeout(speechTimer.current);
    speechTimer.current = setTimeout(() => setSpeech(""), 2800);
  }

  async function handleDelete(id) {
    const next = entries.filter((e) => e.id !== id);
    await persist(next);
  }

  const mascotPct = Math.min(100, (todayTotal / 10000) * 100);

  return (
    <div className="app">
      <style>{`
        * { box-sizing: border-box; }
        .app {
          font-family: 'M PLUS Rounded 1c', 'Hiragino Maru Gothic ProN', sans-serif;
          background: radial-gradient(circle at 15% 0%, #FFE9F3 0%, #FFF3F8 45%, #FFF9EF 100%);
          min-height: 100vh;
          color: #3A2E4D;
          padding: 20px 14px 60px;
        }
        .shell { max-width: 460px; margin: 0 auto; }

        .header { text-align: center; padding-top: 4px; }
        .title {
          font-size: 26px; font-weight: 800; letter-spacing: 0.5px;
          background: linear-gradient(90deg, #FF6FA5, #9B7EDE);
          -webkit-background-clip: text; background-clip: text; color: transparent;
          margin: 0 0 2px;
        }
        .subtitle { font-size: 12.5px; color: #9B8AA8; margin: 0 0 10px; }

        .jelly-wrap { position: relative; width: 150px; height: 150px; margin: 6px auto 4px; }
        .jelly-blob {
          width: 100%; height: 100%;
          background: #ffffff;
          border: 3.5px solid #3A2E4D;
          border-radius: 46% 54% 58% 42% / 55% 48% 52% 45%;
          overflow: hidden;
          position: relative;
          box-shadow: 0 10px 0 rgba(58,46,77,0.06), 0 8px 20px rgba(255,111,165,0.25);
          transition: transform 0.25s ease;
        }
        .jelly-pop { animation: pop 0.5s ease; }
        @keyframes pop { 0%{transform:scale(1)} 30%{transform:scale(1.12) rotate(-2deg)} 60%{transform:scale(0.96) rotate(2deg)} 100%{transform:scale(1)} }

        .jelly-liquid {
          position: absolute; bottom: 0; left: 0; width: 100%;
          background: linear-gradient(180deg, #FFA9C9 0%, #FF6FA5 100%);
          transition: height 0.6s cubic-bezier(.34,1.56,.64,1);
          overflow: hidden;
        }
        .wave {
          position: absolute; left: 50%; top: -60%;
          width: 220%; height: 220%;
          border-radius: 42%;
          background: rgba(255,255,255,0.22);
          transform: translate(-50%, 0) rotate(0deg);
        }
        .wave1 { animation: spin 7s linear infinite; }
        .wave2 { animation: spin 11s linear infinite reverse; background: rgba(255,255,255,0.14); }
        @keyframes spin { from { transform: translate(-50%,0) rotate(0deg);} to { transform: translate(-50%,0) rotate(360deg);} }

        .jelly-face { position: absolute; top: 40%; left: 50%; transform: translate(-50%,-50%); width: 60px; z-index: 3; }
        .eye { width: 8px; height: 8px; border-radius: 50%; background: #3A2E4D; position: absolute; top: 0; }
        .eye-l { left: 14px; } .eye-r { left: 38px; }
        .mouth { position: absolute; top: 12px; left: 22px; width: 16px; height: 8px; border-radius: 0 0 16px 16px; border: 2.5px solid #3A2E4D; border-top: none; }

        .tentacle {
          position: absolute; bottom: -6px; width: 6px; height: 22px;
          background: #3A2E4D; border-radius: 4px; opacity: 0.85;
          animation: wiggle 1.8s ease-in-out infinite;
        }
        .t1 { left: 26%; animation-delay: 0s; }
        .t2 { left: 42%; animation-delay: 0.3s; }
        .t3 { left: 56%; animation-delay: 0.15s; }
        .t4 { left: 70%; animation-delay: 0.45s; }
        @keyframes wiggle { 0%,100%{ transform: rotate(-8deg);} 50%{ transform: rotate(8deg);} }

        .bubble { position: absolute; border-radius: 50%; background: rgba(255,255,255,0.55); animation: rise 3.5s linear infinite; }
        .b1 { width: 6px; height: 6px; left: 30%; bottom: 6px; animation-delay: 0s; }
        .b2 { width: 4px; height: 4px; left: 55%; bottom: 6px; animation-delay: 1s; }
        .b3 { width: 5px; height: 5px; left: 68%; bottom: 6px; animation-delay: 2s; }
        @keyframes rise { 0% { transform: translateY(0); opacity: 0.9; } 100% { transform: translateY(-70px); opacity: 0; } }

        .confetti { position: absolute; inset: 0; pointer-events: none; }
        .confetti-piece { position: absolute; top: 10%; width: 7px; height: 10px; border-radius: 2px; animation: fall 0.9s ease-out forwards; }
        @keyframes fall { 0% { top: 10%; opacity: 1; } 100% { top: 95%; opacity: 0; } }

        .speech-bubble {
          position: absolute; top: -8px; left: 50%;
          transform: translate(-50%, -100%) scale(0.8);
          background: #fff; color: #3A2E4D; font-weight: 700; font-size: 13px;
          padding: 10px 16px; border-radius: 16px; white-space: nowrap;
          border: 2.5px solid #3A2E4D; box-shadow: 0 4px 10px rgba(58,46,77,0.15);
          opacity: 0; pointer-events: none; z-index: 5;
          transition: opacity 0.2s ease, transform 0.2s ease;
        }
        .speech-bubble::after {
          content: ""; position: absolute; bottom: -9px; left: 50%; transform: translateX(-50%);
          border-width: 9px 7px 0 7px; border-style: solid;
          border-color: #3A2E4D transparent transparent transparent;
        }
        .speech-bubble::before {
          content: ""; position: absolute; bottom: -6px; left: 50%; transform: translateX(-50%);
          border-width: 7px 6px 0 6px; border-style: solid;
          border-color: #fff transparent transparent transparent; z-index: 1;
        }
        .speech-bubble.show { opacity: 1; transform: translate(-50%, -100%) scale(1); }

        .today-line { text-align: center; font-size: 13px; color: #7A6B90; margin-bottom: 14px; }
        .today-line b { color: #FF4785; font-size: 15px; }

        .tabs {
          display: flex; background: #fff; border-radius: 999px; padding: 4px;
          box-shadow: 0 4px 14px rgba(155,126,222,0.15); margin-bottom: 16px;
        }
        .tab-btn {
          flex: 1; border: none; background: transparent; padding: 10px 0;
          border-radius: 999px; font-family: inherit; font-weight: 700; font-size: 14px;
          color: #B3A4C7; cursor: pointer; transition: all 0.25s;
        }
        .tab-btn.active { background: linear-gradient(90deg,#FF6FA5,#9B7EDE); color: #fff; box-shadow: 0 4px 10px rgba(255,111,165,0.35); }

        .card {
          background: #fff; border-radius: 22px; padding: 18px;
          box-shadow: 0 6px 18px rgba(155,126,222,0.12);
          margin-bottom: 14px;
        }

        .field-label { font-size: 12.5px; font-weight: 700; color: #9B8AA8; margin-bottom: 6px; display: block; }
        .field { margin-bottom: 16px; }
        input[type="date"], input[type="number"], input[type="text"] {
          width: 100%; border: 2px solid #F1E5EF; background: #FFFBFD;
          border-radius: 14px; padding: 11px 13px; font-size: 15px;
          font-family: inherit; color: #3A2E4D; outline: none; transition: border 0.2s;
        }
        input:focus { border-color: #FF9EC0; }

        .chip-row { display: flex; gap: 8px; flex-wrap: wrap; }
        .chip {
          border: 2.5px solid transparent; border-radius: 14px; padding: 10px 0;
          flex: 1; min-width: 60px; text-align: center; font-weight: 800; font-size: 14px;
          cursor: pointer; transition: all 0.15s; font-family: inherit;
        }
        .chip.selected { transform: translateY(-2px); box-shadow: 0 5px 0 rgba(0,0,0,0.06); }

        .amount-yen { position: relative; }
        .amount-yen span { position: absolute; left: 13px; top: 50%; transform: translateY(-50%); color: #C9BBD8; font-weight: 700; }
        .amount-yen input { padding-left: 30px; font-weight: 700; font-size: 17px; }

        .add-btn {
          width: 100%; border: none; padding: 15px; border-radius: 16px;
          background: linear-gradient(90deg,#FF6FA5,#FF4785); color: #fff;
          font-family: inherit; font-weight: 800; font-size: 16px; cursor: pointer;
          box-shadow: 0 6px 0 #D63C74; display: flex; align-items: center; justify-content: center; gap: 6px;
          transition: transform 0.08s;
        }
        .add-btn:active { transform: translateY(3px); box-shadow: 0 3px 0 #D63C74; }
        .add-btn:disabled { background: #EADFF0; box-shadow: 0 6px 0 #D8CBE2; cursor: not-allowed; }

        .summary-row { display: flex; gap: 10px; margin-bottom: 6px; }
        .summary-card { flex: 1; border-radius: 18px; padding: 14px; text-align: center; }
        .summary-card.day { background: #FFE3EE; }
        .summary-card.month { background: #ECE3FB; }
        .summary-card .label { font-size: 11.5px; font-weight: 700; color: #8A7A9E; margin-bottom: 4px; }
        .summary-card .value { font-size: 19px; font-weight: 800; color: #3A2E4D; }

        .month-nav { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
        .month-nav button {
          border: none; background: #fff; width: 36px; height: 36px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center; cursor: pointer;
          box-shadow: 0 3px 8px rgba(155,126,222,0.18); color: #9B7EDE;
        }
        .month-nav .month-label { font-weight: 800; font-size: 16px; display: flex; align-items: center; gap: 6px; }

        .month-total-banner {
          text-align: center; background: linear-gradient(90deg,#FFE3EE,#ECE3FB);
          border-radius: 18px; padding: 12px; margin-bottom: 16px; font-weight: 700; font-size: 13.5px; color: #6B5A80;
        }
        .month-total-banner b { font-size: 17px; color: #FF4785; }

        .day-group { margin-bottom: 16px; }
        .day-group-head { display: flex; justify-content: space-between; align-items: baseline; padding: 0 4px 8px; }
        .day-group-head .d { font-weight: 800; font-size: 14.5px; }
        .day-group-head .t { font-size: 13px; color: #FF4785; font-weight: 700; }

        .entry-row {
          background: #fff; border-radius: 16px; padding: 12px 14px; margin-bottom: 8px;
          display: flex; align-items: center; gap: 10px; box-shadow: 0 3px 10px rgba(155,126,222,0.10);
        }
        .cat-badge { width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 12px; flex-shrink: 0; }
        .entry-mid { flex: 1; min-width: 0; }
        .entry-amt { font-weight: 800; font-size: 15px; }
        .entry-memo { font-size: 12px; color: #9B8AA8; margin-top: 1px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .del-btn { border: none; background: #FFF3F6; color: #FF6FA5; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; flex-shrink: 0; }

        .empty-state { text-align: center; padding: 40px 10px; color: #B3A4C7; }
        .empty-state .emoji { font-size: 34px; margin-bottom: 8px; }

        .loading { text-align: center; padding: 60px 0; color: #B3A4C7; font-weight: 700; }

        .year-banner {
          text-align: center; background: linear-gradient(90deg,#FFE3EE,#ECE3FB);
          border-radius: 20px; padding: 18px; margin-bottom: 16px;
        }
        .year-banner .label { font-size: 12.5px; font-weight: 700; color: #8A7A9E; margin-bottom: 4px; }
        .year-banner .value { font-size: 26px; font-weight: 800; color: #FF4785; }

        .month-card {
          background: #fff; border-radius: 16px; padding: 13px 16px; margin-bottom: 8px;
          display: flex; align-items: center; justify-content: space-between;
          box-shadow: 0 3px 10px rgba(155,126,222,0.10); cursor: pointer; border: 2px solid transparent;
          transition: border 0.15s, transform 0.1s;
        }
        .month-card:hover { border-color: #FFCFE1; transform: translateY(-1px); }
        .month-card.empty { opacity: 0.45; cursor: default; }
        .month-card .m-name { font-weight: 800; font-size: 15px; }
        .month-card .m-total { font-weight: 800; font-size: 15px; color: #FF4785; }
        .month-card .m-count { font-size: 11.5px; color: #B3A4C7; margin-left: 6px; }

        .connect-note { text-align: center; font-size: 11.5px; color: #B3A4C7; margin-top: 18px; line-height: 1.6; }
      `}</style>

      <div className="shell">
        <div className="header">
          <p className="title">おかね日記</p>
          <p className="subtitle">きょうの記録、くらげが見守るよ</p>
          <JellyMascot pct={mascotPct} celebrate={celebrate} speech={speech} />
          <p className="today-line">
            今日の合計 <b>{formatYen(todayTotal)}</b>
          </p>
        </div>

        <div className="tabs">
          <button className={"tab-btn" + (tab === "input" ? " active" : "")} onClick={() => setTab("input")}>
            きろく
          </button>
          <button className={"tab-btn" + (tab === "history" ? " active" : "")} onClick={() => setTab("history")}>
            りれき
          </button>
          <button className={"tab-btn" + (tab === "summary" ? " active" : "")} onClick={() => setTab("summary")}>
            集計
          </button>
        </div>

        {loading ? (
          <div className="loading">よみこみ中...</div>
        ) : tab === "input" ? (
          <>
            <div className="card">
              <div className="field">
                <label className="field-label">日付</label>
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>

              <div className="field">
                <label className="field-label">項目</label>
                <div className="chip-row">
                  {CATEGORIES.map((c) => (
                    <button
                      key={c.key}
                      type="button"
                      className={"chip" + (category === c.key ? " selected" : "")}
                      style={{
                        background: category === c.key ? c.soft : "#F9F6FB",
                        borderColor: category === c.key ? c.color : "transparent",
                        color: category === c.key ? c.color : "#B3A4C7",
                      }}
                      onClick={() => setCategory(c.key)}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="field">
                <label className="field-label">金額</label>
                <div className="amount-yen">
                  <span>¥</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    min="0"
                    placeholder="0"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                </div>
              </div>

              <div className="field" style={{ marginBottom: 18 }}>
                <label className="field-label">メモ（任意）</label>
                <input
                  type="text"
                  placeholder="例：〇〇さんから入金"
                  value={memo}
                  onChange={(e) => setMemo(e.target.value)}
                />
              </div>

              <button className="add-btn" onClick={handleAdd} disabled={!amount || Number(amount) <= 0 || saving}>
                <Sparkles size={18} /> 記録する
              </button>
            </div>

            <div className="summary-row">
              <div className="summary-card day">
                <div className="label">今日の合計</div>
                <div className="value">{formatYen(todayTotal)}</div>
              </div>
              <div className="summary-card month">
                <div className="label">今月の合計</div>
                <div className="value">{formatYen(thisMonthTotal)}</div>
              </div>
            </div>
          </>
        ) : tab === "history" ? (
          <>
            <div className="month-nav">
              <button onClick={() => setHistoryMonth((m) => shiftMonth(m, -1))}>
                <ChevronLeft size={18} />
              </button>
              <div className="month-label">
                <CalendarDays size={17} /> {monthLabel(historyMonth)}
              </div>
              <button onClick={() => setHistoryMonth((m) => shiftMonth(m, 1))}>
                <ChevronRight size={18} />
              </button>
            </div>

            <div className="month-total-banner">
              この月の合計　<b>{formatYen(historyMonthTotal)}</b>
            </div>

            {historyGroups.length === 0 ? (
              <div className="empty-state">
                <div className="emoji">🎐</div>
                この月の記録はまだないよ
              </div>
            ) : (
              historyGroups.map((g) => (
                <div className="day-group" key={g.date}>
                  <div className="day-group-head">
                    <span className="d">{formatDateLabel(g.date)}</span>
                    <span className="t">{formatYen(g.total)}</span>
                  </div>
                  {g.entries.map((e) => {
                    const ci = catInfo(e.category);
                    return (
                      <div className="entry-row" key={e.id}>
                        <div className="cat-badge" style={{ background: ci.soft, color: ci.color }}>
                          {ci.label}
                        </div>
                        <div className="entry-mid">
                          <div className="entry-amt">{formatYen(e.amount)}</div>
                          {e.memo && <div className="entry-memo">{e.memo}</div>}
                        </div>
                        <button className="del-btn" onClick={() => handleDelete(e.id)} aria-label="削除">
                          <Trash2 size={15} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              ))
            )}
          </>
        ) : null}

        {!loading && tab === "summary" && (
          <>
            <div className="month-nav">
              <button onClick={() => setSummaryYear((y) => String(Number(y) - 1))}>
                <ChevronLeft size={18} />
              </button>
              <div className="month-label">
                <CalendarDays size={17} /> {summaryYear}年
              </div>
              <button onClick={() => setSummaryYear((y) => String(Number(y) + 1))}>
                <ChevronRight size={18} />
              </button>
            </div>

            <div className="year-banner">
              <div className="label">年間の合計</div>
              <div className="value">{formatYen(yearTotal)}</div>
            </div>

            {monthsInYear.map((mo) => (
              <div
                key={mo.key}
                className={"month-card" + (mo.count === 0 ? " empty" : "")}
                onClick={() => {
                  if (mo.count === 0) return;
                  setHistoryMonth(mo.key);
                  setTab("history");
                }}
              >
                <span className="m-name">
                  {mo.m}月{mo.count > 0 && <span className="m-count">{mo.count}件</span>}
                </span>
                <span className="m-total">{formatYen(mo.total)}</span>
              </div>
            ))}

            <div className="connect-note">スプレッドシート連携を追加すると、ここに顧客ごとの記録も表示できるようになります</div>
          </>
        )}

        {loadError && (
          <div style={{ textAlign: "center", fontSize: 12, color: "#FF6FA5", marginTop: 10 }}>
            ⚠️ 保存に失敗することがあります。時間をおいて再度お試しください。
          </div>
        )}
      </div>
    </div>
  );
}
