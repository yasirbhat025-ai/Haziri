import React, { useState, useEffect, useCallback } from "react";
import { Plus, Minus, ChevronLeft, ChevronDown, Trash2, BookOpen, CalendarClock, Mountain, Moon, AlertTriangle } from "lucide-react";

// Polyfill window.storage with localStorage so this runs as a normal web app
if (typeof window !== "undefined" && !window.storage) {
  window.storage = {
    get: async (key) => {
      const v = window.localStorage.getItem(key);
      return v === null ? null : { key, value: v, shared: false };
    },
    set: async (key, value) => {
      window.localStorage.setItem(key, value);
      return { key, value, shared: false };
    },
    delete: async (key) => {
      window.localStorage.removeItem(key);
      return { key, deleted: true, shared: false };
    },
    list: async (prefix) => {
      const keys = Object.keys(window.localStorage).filter((k) => !prefix || k.startsWith(prefix));
      return { keys, prefix, shared: false };
    },
  };
}

const FONT_IMPORT_ID = "attendance-fonts";

function useFonts() {
  useEffect(() => {
    if (document.getElementById(FONT_IMPORT_ID)) return;
    const link = document.createElement("link");
    link.id = FONT_IMPORT_ID;
    link.rel = "stylesheet";
    link.href =
      "https://fonts.googleapis.com/css2?family=Fredoka:wght@500;600;700&family=Inter:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap";
    document.head.appendChild(link);
  }, []);
}

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

const DAY_CODES = ["MO", "TU", "WE", "TH", "FR", "SA", "SU"];
const DAY_LABELS = { MO: "Mon", TU: "Tue", WE: "Wed", TH: "Thu", FR: "Fri", SA: "Sat", SU: "Sun" };

function todayCode() {
  const idx = new Date().getDay();
  return ["SU", "MO", "TU", "WE", "TH", "FR", "SA"][idx];
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function pctOf(attended, held) {
  return held > 0 ? (attended / held) * 100 : null;
}

function bunkMath(attended, held, requiredPct) {
  const t = requiredPct / 100;
  if (held === 0) return { canSkip: null, mustAttend: null, isSafe: true };
  const canSkip = Math.floor(attended / t - held);
  let mustAttend = 0;
  if (t < 1) mustAttend = Math.ceil((t * held - attended) / (1 - t));
  return {
    canSkip: canSkip > 0 ? canSkip : 0,
    mustAttend: mustAttend > 0 ? mustAttend : 0,
    isSafe: attended / held >= t,
  };
}

// ---- Hero illustration: a boy with a backpack running away from school ----
function RunningBoyHero() {
  return (
    <div style={{ position: "relative", height: 148, overflow: "hidden" }}>
      <style>{`
        @keyframes runBob {
          0%, 100% { transform: translateY(0) rotate(-2deg); }
          50% { transform: translateY(-4px) rotate(2deg); }
        }
        @keyframes legFront {
          0%, 100% { transform: rotate(35deg); }
          50% { transform: rotate(-25deg); }
        }
        @keyframes legBack {
          0%, 100% { transform: rotate(-25deg); }
          50% { transform: rotate(35deg); }
        }
        @keyframes armSwing {
          0%, 100% { transform: rotate(-30deg); }
          50% { transform: rotate(30deg); }
        }
        @keyframes dustPuff {
          0% { opacity: 0.5; transform: translateX(0) scale(1); }
          100% { opacity: 0; transform: translateX(14px) scale(1.6); }
        }
        .runner-group { animation: runBob 0.55s ease-in-out infinite; transform-origin: 50% 100%; }
        .leg-front { animation: legFront 0.55s ease-in-out infinite; transform-origin: 50% 0%; }
        .leg-back { animation: legBack 0.55s ease-in-out infinite; transform-origin: 50% 0%; }
        .arm-swing { animation: armSwing 0.55s ease-in-out infinite; transform-origin: 50% 0%; }
        .dust { animation: dustPuff 0.9s ease-out infinite; }
        .dust2 { animation: dustPuff 0.9s ease-out infinite 0.3s; }
      `}</style>
      <svg viewBox="0 0 480 148" width="100%" height="148" preserveAspectRatio="xMidYMax slice">
        <defs>
          <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FFD6A0" />
            <stop offset="100%" stopColor="#FFF6E9" />
          </linearGradient>
        </defs>
        <rect x="0" y="0" width="480" height="148" fill="url(#sky)" />

        {/* sun */}
        <circle cx="430" cy="34" r="16" fill="#FFB84D" opacity="0.8" />

        {/* ground */}
        <rect x="0" y="122" width="480" height="26" fill="#E8C98A" />
        <rect x="0" y="120" width="480" height="3" fill="#F4CE8C" />

        {/* school building, right side, small and receding */}
        <g opacity="0.9">
          <rect x="392" y="86" width="56" height="36" fill="#C9B8E8" />
          <polygon points="388,86 452,86 420,66" fill="#FF3B5C" />
          <rect x="412" y="100" width="10" height="22" fill="#FFF6E9" />
          <rect x="398" y="94" width="8" height="8" fill="#FFF6E9" />
          <rect x="436" y="94" width="8" height="8" fill="#FFF6E9" />
          <line x1="420" y1="66" x2="420" y2="54" stroke="#9A8FC2" strokeWidth="2" />
          <polygon points="420,54 420,60 432,57" fill="#FF3B5C" />
        </g>

        {/* school gate, just left of the building */}
        <g opacity="0.9">
          <rect x="352" y="76" width="5" height="46" fill="#B65C1F" />
          <rect x="386" y="76" width="5" height="46" fill="#B65C1F" />
          <path d="M 352 76 Q 371 60 391 76" stroke="#B65C1F" strokeWidth="4" fill="none" />
          <line x1="357" y1="100" x2="386" y2="100" stroke="#FF6B35" strokeWidth="2" />
        </g>

        {/* dust puffs behind runner */}
        <circle className="dust" cx="325" cy="118" r="5" fill="#F4CE8C" />
        <circle className="dust2" cx="315" cy="121" r="4" fill="#F4CE8C" />

        {/* running boy, facing left (away from school), right at the gate */}
        <g className="runner-group" transform="translate(350,60)">
          {/* back arm */}
          <g className="arm-swing" transform="translate(6,10)">
            <rect x="-2" y="0" width="6" height="24" rx="3" fill="#241B45" />
          </g>
          {/* back leg */}
          <g className="leg-back" transform="translate(4,46)">
            <rect x="-3" y="0" width="7" height="26" rx="3" fill="#1FAE6B" />
          </g>
          {/* front leg */}
          <g className="leg-front" transform="translate(-2,46)">
            <rect x="-3" y="0" width="7" height="26" rx="3" fill="#167A4C" />
          </g>
          {/* torso */}
          <rect x="-13" y="8" width="24" height="34" rx="8" fill="#FF6B35" />
          {/* backpack */}
          <rect x="2" y="10" width="16" height="24" rx="5" fill="#FF3B5C" />
          <rect x="4" y="8" width="6" height="6" rx="2" fill="#B23350" />
          {/* head */}
          <circle cx="-2" cy="-4" r="11" fill="#E9C9A0" />
          {/* hair */}
          <path d="M -13 -6 Q -2 -20 9 -6 Q 4 -12 -2 -12 Q -9 -12 -13 -6 Z" fill="#241B45" />
          {/* front arm */}
          <g transform="translate(-10,10) rotate(-40)">
            <rect x="-2" y="0" width="6" height="22" rx="3" fill="#241B45" />
          </g>
        </g>
      </svg>
    </div>
  );
}

// ---- Logo: a sleeping kid, head down, dozing through class ----
function SleepingKidLogo({ size = 42 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 44 44" style={{ flexShrink: 0 }}>
      <rect x="1" y="1" width="42" height="42" rx="12" fill="#FF6B35" opacity="0.16" stroke="#FF6B35" strokeWidth="1.5" />
      {/* desk */}
      <rect x="8" y="30" width="28" height="4" rx="1.5" fill="#FF6B35" />
      {/* folded arm / pillow */}
      <ellipse cx="24" cy="27" rx="10" ry="5" fill="#FF3B5C" opacity="0.9" />
      {/* head resting */}
      <circle cx="17" cy="21" r="9" fill="#E9C9A0" />
      {/* hair */}
      <path d="M 9 19 Q 14 8 24 12 Q 20 10 15 12 Q 10 14 9 19 Z" fill="#241B45" />
      {/* closed eye */}
      <path d="M 13.5 22 Q 16 24 18.5 22" stroke="#241B45" strokeWidth="1.4" fill="none" strokeLinecap="round" />
      {/* little smile */}
      <path d="M 15.5 25.5 Q 17 26.5 18.5 25.5" stroke="#241B45" strokeWidth="1.1" fill="none" strokeLinecap="round" />
      {/* Zzz */}
      <text x="26" y="14" fontFamily="'IBM Plex Mono', monospace" fontSize="7" fontWeight="700" fill="#FF6B35">z</text>
      <text x="30" y="10" fontFamily="'IBM Plex Mono', monospace" fontSize="9" fontWeight="700" fill="#FF6B35">Z</text>
      <text x="35" y="6.5" fontFamily="'IBM Plex Mono', monospace" fontSize="6" fontWeight="700" fill="#FF6B35">z</text>
    </svg>
  );
}

function CelebrationPopup({ icon, title, subtitle, onClose }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(35,39,46,0.35)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 50,
        animation: "fadeIn 150ms ease",
      }}
    >
      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes popIn {
          0% { transform: scale(0.7) translateY(10px); opacity: 0; }
          70% { transform: scale(1.05); opacity: 1; }
          100% { transform: scale(1) translateY(0); opacity: 1; }
        }
      `}</style>
      <div
        style={{
          background: "#FFF6E9",
          border: "1.5px solid #FF6B35",
          borderRadius: 16,
          padding: "28px 32px",
          textAlign: "center",
          maxWidth: 280,
          animation: "popIn 260ms cubic-bezier(.2,1.4,.4,1)",
          boxShadow: "0 12px 30px rgba(35,39,46,0.25)",
        }}
      >
        {icon}
        <p style={{ fontFamily: "'Fredoka', sans-serif", fontSize: 20, margin: "12px 0 4px", color: "#241B45" }}>
          {title}
        </p>
        <p style={{ fontSize: 13, color: "#5B5480", margin: 0, lineHeight: 1.5 }}>{subtitle}</p>
      </div>
    </div>
  );
}

export default function AttendanceApp() {
  useFonts();

  const [subjects, setSubjects] = useState(null);
  const [tab, setTab] = useState("today");
  const [view, setView] = useState(null); // null | newSubject
  const [expandedId, setExpandedId] = useState(null);
  const [currentDate] = useState(todayStr());
  const [todayCd] = useState(todayCode());
  const [error, setError] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [popup, setPopup] = useState(null);

  const [form, setForm] = useState({ name: "", held: 0, attended: 0, days: [], requiredPct: 75, notes: "" });

  useEffect(() => {
    (async () => {
      try {
        const res = await window.storage.get("subjects_v4", false);
        setSubjects(res ? JSON.parse(res.value) : []);
      } catch (e) {
        setSubjects([]);
      }
      setLoaded(true);
    })();
  }, []);

  const saveSubjects = useCallback(async (next) => {
    setSubjects(next);
    try {
      await window.storage.set("subjects_v4", JSON.stringify(next), false);
    } catch (e) {
      setError("Couldn't save — try again.");
    }
  }, []);

  function toggleDay(days, code) {
    return days.includes(code) ? days.filter((d) => d !== code) : [...days, code];
  }

  function resetForm() {
    setForm({ name: "", held: 0, attended: 0, days: [], requiredPct: 75, notes: "" });
  }

  function addSubject() {
    const name = form.name.trim();
    if (!name) return;
    const held = Math.max(0, Number(form.held) || 0);
    const attended = Math.min(held, Math.max(0, Number(form.attended) || 0));
    const requiredPct = Math.min(100, Math.max(1, Number(form.requiredPct) || 75));
    const subj = {
      id: uid(),
      name,
      days: form.days,
      held,
      attended,
      requiredPct,
      notes: form.notes.trim(),
      marks: {},
    };
    saveSubjects([...(subjects || []), subj]);
    resetForm();
    setView(null);
    setTab("today");
  }

  function deleteSubject(id) {
    saveSubjects(subjects.filter((s) => s.id !== id));
    if (expandedId === id) setExpandedId(null);
  }

  function updateSubjectField(id, field, value) {
    const next = subjects.map((s) => (s.id === id ? { ...s, [field]: value } : s));
    saveSubjects(next);
  }

  function markToday(subjectId, status) {
    let outcome = null; // 'attended' | 'missed-safe' | 'missed-risk'
    const next = subjects.map((s) => {
      if (s.id !== subjectId) return s;
      const marks = { ...s.marks };
      const log = [...(marks[currentDate] || []), status];
      marks[currentDate] = log;

      const held = s.held + 1;
      const attended = status === "attended" ? s.attended + 1 : s.attended;

      if (status === "attended") {
        outcome = "attended";
      } else {
        const pct = held > 0 ? (attended / held) * 100 : 100;
        outcome = pct >= s.requiredPct ? "missed-safe" : "missed-risk";
      }

      return { ...s, held, attended, marks };
    });
    saveSubjects(next);
    if (outcome) {
      setPopup(outcome);
      setTimeout(() => setPopup(null), 1700);
    }
  }

  function undoLastMark(subjectId) {
    const next = subjects.map((s) => {
      if (s.id !== subjectId) return s;
      const log = [...(s.marks[currentDate] || [])];
      if (log.length === 0) return s;
      const last = log.pop();
      const marks = { ...s.marks, [currentDate]: log };
      const held = Math.max(0, s.held - 1);
      const attended = last === "attended" ? Math.max(0, s.attended - 1) : s.attended;
      return { ...s, held, attended, marks };
    });
    saveSubjects(next);
  }

  const paper = "#FFF6E9";
  const ink = "#241B45";
  const rule = "#F4CE8C";
  const brass = "#FF6B35";
  const present = "#1FAE6B";
  const absent = "#FF3B5C";

  if (!loaded) {
    return (
      <div style={{ minHeight: "100vh", background: paper, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ fontFamily: "'IBM Plex Mono', monospace", color: ink, fontSize: 13, letterSpacing: "0.08em" }}>
          OPENING REGISTER…
        </div>
      </div>
    );
  }

  const todaysSubjects = subjects.filter((s) => s.days.includes(todayCd));

  const dayChip = (code, active, onClick) => (
    <button
      key={code}
      onClick={onClick}
      className="pill"
      style={{
        width: 34,
        height: 34,
        borderRadius: "50%",
        border: `1.5px solid ${active ? brass : rule}`,
        background: active ? brass : "transparent",
        color: active ? paper : "#5B5480",
        fontFamily: "'IBM Plex Mono', monospace",
        fontSize: 11,
        fontWeight: 600,
        cursor: "pointer",
      }}
    >
      {DAY_LABELS[code][0]}
    </button>
  );

  return (
    <div
      style={{
        minHeight: "100vh",
        background: paper,
        fontFamily: "'Inter', sans-serif",
        color: ink,
        display: "flex",
        flexDirection: "column",
        maxWidth: 480,
        margin: "0 auto",
      }}
    >
      <style>{`
        .row:active { background: rgba(35,39,46,0.04); }
        .pill { transition: transform 120ms ease; }
        .pill:active { transform: scale(0.92); }
        ::selection { background: ${brass}33; }
      `}</style>

      {popup === "attended" && (
        <CelebrationPopup
          icon={<Mountain size={34} color="#1FAE6B" strokeWidth={1.75} />}
          title="Good job!"
          subtitle="Off to mountains soon."
          onClose={() => setPopup(null)}
        />
      )}
      {popup === "missed-safe" && (
        <CelebrationPopup
          icon={<Moon size={34} color="#1FAE6B" strokeWidth={1.75} />}
          title="Still safe!"
          subtitle="Enjoy sleeping."
          onClose={() => setPopup(null)}
        />
      )}
      {popup === "missed-risk" && (
        <CelebrationPopup
          icon={<AlertTriangle size={34} color="#FF3B5C" strokeWidth={1.75} />}
          title="Get ready"
          subtitle="For extra classes."
          onClose={() => setPopup(null)}
        />
      )}

      {/* Hero */}
      <div style={{ position: "relative", borderRadius: "0 0 22px 22px", overflow: "hidden", boxShadow: "0 8px 20px rgba(255,107,53,0.18)" }}>
        <RunningBoyHero />
        <div style={{ position: "absolute", top: 16, left: 20, right: 20, display: "flex", alignItems: "center", gap: 10 }}>
          <SleepingKidLogo size={40} />
          <div>
            <h1
              style={{
                fontFamily: "'Fredoka', sans-serif",
                fontWeight: 700,
                fontSize: 26,
                margin: 0,
                letterSpacing: "-0.01em",
                color: ink,
              }}
            >
              Haziri
            </h1>
            <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: "#B65C1F", letterSpacing: "0.06em", margin: "2px 0 0" }}>
              {DAY_LABELS[todayCd]}
            </p>
          </div>
        </div>
      </div>

      <div style={{ padding: "0 20px" }}>
        {view === null && (
          <div style={{ display: "flex", gap: 4, marginTop: 12 }}>
            {[
              ["today", "TODAY"],
              ["subjects", "SUBJECTS"],
            ].map(([key, label]) => {
              const active = tab === key;
              return (
                <button
                  key={key}
                  onClick={() => setTab(key)}
                  style={{
                    flexShrink: 0,
                    padding: "8px 16px",
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: 12,
                    fontWeight: 500,
                    letterSpacing: "0.05em",
                    border: `1.5px solid ${active ? brass : rule}`,
                    borderBottom: active ? `1.5px solid ${paper}` : `1.5px solid ${rule}`,
                    borderRadius: "6px 6px 0 0",
                    background: active ? paper : "transparent",
                    color: active ? ink : "#9A8FC2",
                    cursor: "pointer",
                    position: "relative",
                    top: 1,
                    zIndex: active ? 2 : 1,
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>
        )}
        <div style={{ borderBottom: `1.5px solid ${rule}` }} />
      </div>

      {error && (
        <div style={{ margin: "10px 20px 0", fontSize: 12, color: absent, fontFamily: "'IBM Plex Mono', monospace" }}>
          {error}
        </div>
      )}

      {/* New subject form — everything up front */}
      {view === "newSubject" && (
        <div style={{ padding: "16px 20px 40px" }}>
          <button
            onClick={() => {
              resetForm();
              setView(null);
            }}
            style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", color: brass, fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, cursor: "pointer", padding: 0, marginBottom: 16 }}
          >
            <ChevronLeft size={14} /> BACK
          </button>
          <p style={{ fontFamily: "'Fredoka', sans-serif", fontSize: 18, margin: "0 0 16px" }}>Add a subject</p>

          <FieldLabel>Subject name</FieldLabel>
          <TextInput
            autoFocus
            value={form.name}
            onChange={(v) => setForm({ ...form, name: v })}
            placeholder="e.g. Organic Chemistry"
            rule={rule}
            ink={ink}
          />

          <div style={{ display: "flex", gap: 12, marginTop: 14 }}>
            <div style={{ flex: 1 }}>
              <FieldLabel>Classes held so far</FieldLabel>
              <NumberInput value={form.held} onChange={(v) => setForm({ ...form, held: v })} rule={rule} ink={ink} />
            </div>
            <div style={{ flex: 1 }}>
              <FieldLabel>Classes attended so far</FieldLabel>
              <NumberInput value={form.attended} onChange={(v) => setForm({ ...form, attended: v })} rule={rule} ink={ink} />
            </div>
          </div>

          <div style={{ marginTop: 14 }}>
            <FieldLabel>Day of week it's held</FieldLabel>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 4 }}>
              {DAY_CODES.map((code) => dayChip(code, form.days.includes(code), () => setForm({ ...form, days: toggleDay(form.days, code) })))}
            </div>
          </div>

          <div style={{ marginTop: 14 }}>
            <FieldLabel>Required attendance %</FieldLabel>
            <NumberInput value={form.requiredPct} onChange={(v) => setForm({ ...form, requiredPct: v })} rule={rule} ink={ink} max={100} />
          </div>

          <div style={{ marginTop: 14 }}>
            <FieldLabel>Notes (optional — room, professor, anything useful)</FieldLabel>
            <TextInput
              value={form.notes}
              onChange={(v) => setForm({ ...form, notes: v })}
              placeholder="e.g. Room 204, Prof. Rao"
              rule={rule}
              ink={ink}
            />
          </div>

          <button
            onClick={addSubject}
            disabled={!form.name.trim()}
            style={{ marginTop: 22, width: "100%", background: form.name.trim() ? "linear-gradient(135deg, #FF6B35, #FF3B5C)" : "#F2E4C9", color: paper, border: "none", borderRadius: 12, padding: "13px", fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, letterSpacing: "0.05em", cursor: form.name.trim() ? "pointer" : "not-allowed", boxShadow: form.name.trim() ? "0 6px 16px rgba(255,59,92,0.35)" : "none" }}
          >
            ADD SUBJECT
          </button>
        </div>
      )}

      {/* TODAY TAB */}
      {view === null && tab === "today" && (
        <div style={{ padding: "16px 20px 90px", flex: 1 }}>
          {subjects.length === 0 ? (
            <EmptyState brass={brass} ink={ink} paper={paper} onAdd={() => setView("newSubject")} />
          ) : todaysSubjects.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 12px" }}>
              <CalendarClock size={28} color={brass} strokeWidth={1.5} />
              <p style={{ fontSize: 13, color: "#5B5480", marginTop: 12, lineHeight: 1.5 }}>
                No subjects scheduled for {DAY_LABELS[todayCd]}. Check the days set in the Subjects tab.
              </p>
            </div>
          ) : (
            todaysSubjects.map((s) => {
              const pct = pctOf(s.attended, s.held);
              const todayLog = s.marks[currentDate] || [];
              const todayAttended = todayLog.filter((x) => x === "attended").length;
              const todayMissed = todayLog.length - todayAttended;
              const safe = pct === null ? true : pct >= s.requiredPct;
              return (
                <div key={s.id} style={{ padding: "14px 4px", borderBottom: `1px solid ${rule}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 2 }}>
                    <span style={{ fontSize: 15 }}>{s.name}</span>
                    <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: pct === null ? "#C9B8E8" : safe ? present : absent }}>
                      {pct === null ? "—" : `${Math.round(pct)}%`} <span style={{ color: "#C9B8E8" }}>({s.attended}/{s.held})</span>
                    </span>
                  </div>
                  {s.notes && <p style={{ fontSize: 11, color: "#9A8FC2", margin: "0 0 6px" }}>{s.notes}</p>}
                  {todayLog.length > 0 && (
                    <p style={{ fontSize: 11, color: "#9A8FC2", margin: "0 0 6px" }}>
                      Today: {todayAttended} attended, {todayMissed} missed
                    </p>
                  )}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "stretch",
                      gap: 0,
                      marginTop: 8,
                      border: `1.5px solid ${rule}`,
                      borderRadius: 8,
                      overflow: "hidden",
                    }}
                  >
                    <button
                      className="pill"
                      onClick={() => markToday(s.id, "missed")}
                      aria-label="Mark a class missed"
                      style={{
                        position: "relative",
                        width: 46,
                        border: "none",
                        borderRight: `1.5px solid ${rule}`,
                        background: "transparent",
                        color: "#5B5480",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Minus size={16} />
                      {todayMissed > 0 && (
                        <span
                          style={{
                            position: "absolute",
                            top: 3,
                            right: 3,
                            background: absent,
                            color: paper,
                            fontFamily: "'IBM Plex Mono', monospace",
                            fontSize: 9,
                            fontWeight: 700,
                            borderRadius: 8,
                            minWidth: 14,
                            height: 14,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            padding: "0 2px",
                          }}
                        >
                          {todayMissed}
                        </span>
                      )}
                    </button>
                    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "8px 6px", textAlign: "center" }}>
                      {s.held > 0 ? (
                        (() => {
                          const { canSkip, mustAttend, isSafe } = bunkMath(s.attended, s.held, s.requiredPct);
                          return isSafe ? (
                            <span style={{ fontSize: 11.5, color: "#5B5480", lineHeight: 1.4 }}>
                              can miss <strong style={{ color: present }}>{canSkip}</strong> more for {s.requiredPct}%
                            </span>
                          ) : (
                            <span style={{ fontSize: 11.5, color: absent, lineHeight: 1.4 }}>
                              attend next <strong>{mustAttend}</strong> to reach {s.requiredPct}%
                            </span>
                          );
                        })()
                      ) : (
                        <span style={{ fontSize: 11.5, color: "#C9B8E8" }}>no classes logged yet</span>
                      )}
                    </div>
                    <button
                      className="pill"
                      onClick={() => markToday(s.id, "attended")}
                      aria-label="Mark a class attended"
                      style={{
                        position: "relative",
                        width: 46,
                        border: "none",
                        borderLeft: `1.5px solid ${rule}`,
                        background: "transparent",
                        color: "#5B5480",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Plus size={16} />
                      {todayAttended > 0 && (
                        <span
                          style={{
                            position: "absolute",
                            top: 3,
                            right: 3,
                            background: present,
                            color: paper,
                            fontFamily: "'IBM Plex Mono', monospace",
                            fontSize: 9,
                            fontWeight: 700,
                            borderRadius: 8,
                            minWidth: 14,
                            height: 14,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            padding: "0 2px",
                          }}
                        >
                          {todayAttended}
                        </span>
                      )}
                    </button>
                  </div>
                  {todayLog.length > 0 && (
                    <button
                      onClick={() => undoLastMark(s.id)}
                      style={{ background: "none", border: "none", color: "#C9B8E8", cursor: "pointer", fontSize: 11, fontFamily: "'IBM Plex Mono', monospace", padding: "6px 0 0" }}
                    >
                      ↺ undo last mark
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* SUBJECTS TAB */}
      {view === null && tab === "subjects" && (
        <div style={{ padding: "16px 20px 90px", flex: 1 }}>
          {subjects.length === 0 ? (
            <EmptyState brass={brass} ink={ink} paper={paper} onAdd={() => setView("newSubject")} />
          ) : (
            subjects.map((s) => {
              const pct = pctOf(s.attended, s.held);
              const safe = pct === null ? true : pct >= s.requiredPct;
              const { canSkip, mustAttend, isSafe } = bunkMath(s.attended, s.held, s.requiredPct);
              const expanded = expandedId === s.id;
              return (
                <div key={s.id} style={{ borderBottom: `1px solid ${rule}` }}>
                  <div
                    className="row"
                    onClick={() => setExpandedId(expanded ? null : s.id)}
                    style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 4px", cursor: "pointer" }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <ChevronDown size={14} color="#C9B8E8" style={{ transform: expanded ? "rotate(180deg)" : "none", transition: "transform 150ms" }} />
                      <div>
                        <span style={{ fontSize: 15 }}>{s.name}</span>
                        {s.notes && <p style={{ fontSize: 11, color: "#9A8FC2", margin: "2px 0 0" }}>{s.notes}</p>}
                      </div>
                    </div>
                    <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: pct === null ? "#C9B8E8" : safe ? present : absent }}>
                      {pct === null ? "—" : `${Math.round(pct)}%`}
                    </span>
                  </div>

                  {expanded && (
                    <div style={{ padding: "0 4px 18px 26px" }}>
                      <p style={{ fontSize: 12, color: "#9A8FC2", margin: "0 0 8px", fontFamily: "'IBM Plex Mono', monospace" }}>MEETS ON</p>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
                        {DAY_CODES.map((code) =>
                          dayChip(code, s.days.includes(code), () => updateSubjectField(s.id, "days", toggleDay(s.days, code)))
                        )}
                      </div>

                      <p style={{ fontSize: 12, color: "#9A8FC2", margin: "0 0 8px", fontFamily: "'IBM Plex Mono', monospace" }}>
                        ENTER YOUR OWN TOTALS
                      </p>
                      <div style={{ display: "flex", gap: 12, marginBottom: 14 }}>
                        <label style={{ flex: 1 }}>
                          <span style={{ fontSize: 11, color: "#9A8FC2", display: "block", marginBottom: 4 }}>Classes held</span>
                          <input
                            type="number"
                            min={0}
                            value={s.held}
                            onChange={(e) => {
                              const held = Math.max(0, Number(e.target.value) || 0);
                              const attended = Math.min(s.attended, held);
                              updateSubjectField(s.id, "held", held);
                              if (attended !== s.attended) updateSubjectField(s.id, "attended", attended);
                            }}
                            style={{ width: "100%", boxSizing: "border-box", padding: "8px 10px", fontFamily: "'IBM Plex Mono', monospace", fontSize: 14, border: `1.5px solid ${rule}`, borderRadius: 6, background: "#FFFBF2", color: ink }}
                          />
                        </label>
                        <label style={{ flex: 1 }}>
                          <span style={{ fontSize: 11, color: "#9A8FC2", display: "block", marginBottom: 4 }}>Classes attended</span>
                          <input
                            type="number"
                            min={0}
                            max={s.held}
                            value={s.attended}
                            onChange={(e) => {
                              const attended = Math.min(s.held, Math.max(0, Number(e.target.value) || 0));
                              updateSubjectField(s.id, "attended", attended);
                            }}
                            style={{ width: "100%", boxSizing: "border-box", padding: "8px 10px", fontFamily: "'IBM Plex Mono', monospace", fontSize: 14, border: `1.5px solid ${rule}`, borderRadius: 6, background: "#FFFBF2", color: ink }}
                          />
                        </label>
                      </div>

                      <label style={{ display: "block", marginBottom: 14 }}>
                        <span style={{ fontSize: 11, color: "#9A8FC2", display: "block", marginBottom: 4 }}>Required %</span>
                        <input
                          type="number"
                          min={1}
                          max={100}
                          value={s.requiredPct}
                          onChange={(e) => updateSubjectField(s.id, "requiredPct", Math.min(100, Math.max(1, Number(e.target.value) || 1)))}
                          style={{ width: 90, boxSizing: "border-box", padding: "8px 10px", fontFamily: "'IBM Plex Mono', monospace", fontSize: 14, border: `1.5px solid ${rule}`, borderRadius: 6, background: "#FFFBF2", color: ink }}
                        />
                      </label>

                      {s.held > 0 && (
                        <div style={{ background: "#FFFBF2", border: `1px solid ${rule}`, borderRadius: 8, padding: 12, marginBottom: 14 }}>
                          <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: brass, letterSpacing: "0.05em", margin: "0 0 4px" }}>
                            TO STAY ABOVE {s.requiredPct}%
                          </p>
                          {isSafe ? (
                            <p style={{ fontSize: 13, margin: 0, lineHeight: 1.5 }}>
                              Can miss <strong>{canSkip}</strong> more.
                            </p>
                          ) : (
                            <p style={{ fontSize: 13, margin: 0, lineHeight: 1.5, color: absent }}>
                              Attend next <strong>{mustAttend}</strong> in a row to recover.
                            </p>
                          )}
                        </div>
                      )}

                      <button
                        onClick={() => deleteSubject(s.id)}
                        style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", color: "#C9B8E8", cursor: "pointer", fontSize: 12, fontFamily: "'IBM Plex Mono', monospace", padding: 0 }}
                      >
                        <Trash2 size={13} /> delete subject
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
          {subjects.length > 0 && (
            <button
              onClick={() => setView("newSubject")}
              style={{ marginTop: 18, width: "100%", background: "transparent", color: ink, border: `1.5px dashed ${rule}`, borderRadius: 8, padding: "12px", fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, letterSpacing: "0.05em", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
            >
              <Plus size={14} /> ADD SUBJECT
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function FieldLabel({ children }) {
  return (
    <span style={{ fontSize: 11, color: "#9A8FC2", display: "block", marginBottom: 6, fontFamily: "'IBM Plex Mono', monospace", letterSpacing: "0.03em" }}>
      {children}
    </span>
  );
}

function TextInput({ value, onChange, placeholder, rule, ink, autoFocus }) {
  return (
    <input
      autoFocus={autoFocus}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      style={{ width: "100%", boxSizing: "border-box", padding: "11px 13px", fontSize: 14, fontFamily: "'Inter', sans-serif", border: `1.5px solid ${rule}`, borderRadius: 8, background: "#FFFBF2", color: ink, outline: "none" }}
    />
  );
}

function NumberInput({ value, onChange, rule, ink, max }) {
  return (
    <input
      type="number"
      min={0}
      max={max}
      value={value}
      onChange={(e) => onChange(Number(e.target.value) || 0)}
      style={{ width: "100%", boxSizing: "border-box", padding: "11px 13px", fontSize: 14, fontFamily: "'IBM Plex Mono', monospace", border: `1.5px solid ${rule}`, borderRadius: 8, background: "#FFFBF2", color: ink, outline: "none" }}
    />
  );
}

function EmptyState({ brass, ink, paper, onAdd }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 32, textAlign: "center" }}>
      <BookOpen size={32} color={brass} strokeWidth={1.5} />
      <p style={{ fontFamily: "'Fredoka', sans-serif", fontSize: 19, margin: "16px 0 6px" }}>No subjects yet</p>
      <p style={{ fontSize: 13, color: "#5B5480", marginBottom: 20, lineHeight: 1.5 }}>
        Add a subject with its schedule and required percentage — then mark it off day by day.
      </p>
      <button
        onClick={onAdd}
        style={{ background: "linear-gradient(135deg, #FF6B35, #FF3B5C)", color: paper, border: "none", borderRadius: 12, padding: "11px 20px", fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, letterSpacing: "0.05em", cursor: "pointer", boxShadow: "0 6px 16px rgba(255,59,92,0.35)" }}
      >
        + ADD SUBJECT
      </button>
    </div>
  );
}
