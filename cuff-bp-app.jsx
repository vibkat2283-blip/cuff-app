import { useState } from "react";
import { Heart, Share2, LogOut, Plus, Lock, Mail, X, Copy, Check, Activity } from "lucide-react";

const COLORS = {
  ink: "#16231F",
  inkSoft: "#4B5C55",
  primary: "#1B4B43",
  primarySoft: "#2F6B5E",
  bg: "#F1F5F2",
  surface: "#FFFFFF",
  surfaceAlt: "#E9F1ED",
  border: "#D8E4DE",
  normal: "#2F6B5E",
  elevated: "#C9932E",
  high: "#C4562F",
  crisis: "#A63A2C",
};

function categorize(sys, dia) {
  if (sys >= 180 || dia >= 120) return { label: "Crisis", color: COLORS.crisis, order: 4 };
  if (sys >= 140 || dia >= 90) return { label: "High, Stage 2", color: COLORS.high, order: 3 };
  if (sys >= 130 || dia >= 80) return { label: "High, Stage 1", color: COLORS.elevated, order: 2 };
  if (sys >= 120) return { label: "Elevated", color: COLORS.elevated, order: 1 };
  return { label: "Normal", color: COLORS.normal, order: 0 };
}

function percentFor(sys) {
  const clamped = Math.min(200, Math.max(80, sys));
  return (clamped - 80) / (200 - 80);
}

function Gauge({ systolic, diastolic, size = 200, strokeWidth = 14 }) {
  const r = size / 2 - strokeWidth;
  const cx = size / 2;
  const cy = size / 2;
  const percent = percentFor(systolic);
  const zone = categorize(systolic, diastolic);

  const segments = [
    { from: 0, to: 0.333, color: COLORS.normal },
    { from: 0.333, to: 0.5, color: COLORS.elevated },
    { from: 0.5, to: 0.75, color: COLORS.high },
    { from: 0.75, to: 1, color: COLORS.crisis },
  ];

  const pointOn = (p) => {
    const theta = Math.PI * (1 - p);
    return { x: cx + r * Math.cos(theta), y: cy - r * Math.sin(theta) };
  };

  const arcPath = (from, to) => {
    const start = pointOn(from);
    const end = pointOn(to);
    const largeArc = to - from > 0.5 ? 1 : 0;
    return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y}`;
  };

  const marker = pointOn(percent);

  return (
    <svg width={size} height={size / 2 + 24} viewBox={`0 0 ${size} ${size / 2 + 24}`}>
      {segments.map((s, i) => (
        <path
          key={i}
          d={arcPath(s.from, s.to)}
          fill="none"
          stroke={s.color}
          strokeWidth={strokeWidth}
          strokeLinecap="butt"
          opacity={0.85}
        />
      ))}
      <line x1={cx} y1={cy} x2={marker.x} y2={marker.y} stroke={COLORS.ink} strokeWidth={2} />
      <circle cx={cx} cy={cy} r={5} fill={COLORS.ink} />
      <circle cx={marker.x} cy={marker.y} r={7} fill={COLORS.surface} stroke={zone.color} strokeWidth={3} />
    </svg>
  );
}

function seedReadings() {
  return [
    { id: 1, systolic: 118, diastolic: 76, pulse: 68, date: "Aug 18, 7:40 AM" },
    { id: 2, systolic: 132, diastolic: 84, pulse: 74, date: "Aug 19, 8:05 AM" },
    { id: 3, systolic: 126, diastolic: 79, pulse: 71, date: "Aug 20, 7:52 AM" },
  ];
}

export default function CuffApp() {
  const [screen, setScreen] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [readings, setReadings] = useState(seedReadings());
  const [sys, setSys] = useState("");
  const [dia, setDia] = useState("");
  const [pulse, setPulse] = useState("");
  const [showShare, setShowShare] = useState(false);
  const [doctorEmail, setDoctorEmail] = useState("");
  const [linkCopied, setLinkCopied] = useState(false);
  const [shareSent, setShareSent] = useState(false);

  const latest = readings[readings.length - 1];
  const latestZone = latest ? categorize(latest.systolic, latest.diastolic) : null;

  const handleLogin = (e) => {
    e.preventDefault();
    setScreen("dashboard");
  };

  const handleAddReading = (e) => {
    e.preventDefault();
    if (!sys || !dia || !pulse) return;
    const now = new Date();
    const entry = {
      id: Date.now(),
      systolic: parseInt(sys, 10),
      diastolic: parseInt(dia, 10),
      pulse: parseInt(pulse, 10),
      date: now.toLocaleDateString(undefined, { month: "short", day: "numeric" }) +
        ", " + now.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }),
    };
    setReadings([...readings, entry]);
    setSys("");
    setDia("");
    setPulse("");
  };

  const openShare = () => {
    setShowShare(true);
    setShareSent(false);
    setLinkCopied(false);
  };

  const sendShare = () => {
    if (!doctorEmail) return;
    setShareSent(true);
  };

  const copyLink = () => {
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 1800);
  };

  if (screen === "login") {
    return (
      <div
        className="min-h-screen w-full flex items-center justify-center p-6"
        style={{ background: COLORS.bg, fontFamily: "Inter, system-ui, sans-serif" }}
      >
        <style>{`@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700&family=Inter:wght@400;500;600&display=swap');`}</style>
        <form
          onSubmit={handleLogin}
          className="w-full max-w-sm rounded-2xl p-8"
          style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}` }}
        >
          <div className="flex flex-col items-center mb-6">
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center mb-3"
              style={{ background: COLORS.primary }}
            >
              <Heart size={26} color="#fff" strokeWidth={2.2} />
            </div>
            <h1
              className="text-2xl"
              style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, color: COLORS.ink }}
            >
              Cuff
            </h1>
            <p className="text-sm mt-1 text-center" style={{ color: COLORS.inkSoft }}>
              Log your readings. Share them with your doctor.
            </p>
          </div>

          <label className="text-xs font-medium block mb-1" style={{ color: COLORS.inkSoft }}>Email</label>
          <div
            className="flex items-center gap-2 rounded-lg px-3 py-2 mb-4"
            style={{ background: COLORS.surfaceAlt, border: `1px solid ${COLORS.border}` }}
          >
            <Mail size={16} color={COLORS.inkSoft} />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="bg-transparent outline-none text-sm w-full"
              style={{ color: COLORS.ink }}
            />
          </div>

          <label className="text-xs font-medium block mb-1" style={{ color: COLORS.inkSoft }}>Password</label>
          <div
            className="flex items-center gap-2 rounded-lg px-3 py-2 mb-2"
            style={{ background: COLORS.surfaceAlt, border: `1px solid ${COLORS.border}` }}
          >
            <Lock size={16} color={COLORS.inkSoft} />
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="bg-transparent outline-none text-sm w-full"
              style={{ color: COLORS.ink }}
            />
          </div>
          <p className="text-xs mb-5" style={{ color: COLORS.inkSoft }}>
            Demo mode — any email and password will work.
          </p>

          <button
            type="submit"
            className="w-full py-2.5 rounded-lg text-sm font-medium"
            style={{ background: COLORS.primary, color: "#fff" }}
          >
            Sign in
          </button>
        </form>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen w-full"
      style={{ background: COLORS.bg, fontFamily: "Inter, system-ui, sans-serif" }}
    >
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700&family=Inter:wght@400;500;600&display=swap');`}</style>

      <div className="max-w-2xl mx-auto p-5">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{ background: COLORS.primary }}
            >
              <Heart size={16} color="#fff" />
            </div>
            <span
              style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, color: COLORS.ink }}
              className="text-lg"
            >
              Cuff
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={openShare}
              className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg"
              style={{ background: COLORS.primary, color: "#fff" }}
            >
              <Share2 size={14} /> Share with doctor
            </button>
            <button
              onClick={() => setScreen("login")}
              className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg"
              style={{ background: COLORS.surfaceAlt, color: COLORS.inkSoft, border: `1px solid ${COLORS.border}` }}
            >
              <LogOut size={14} /> Log out
            </button>
          </div>
        </div>

        {latest && (
          <div
            className="rounded-2xl p-6 mb-5 flex flex-col items-center"
            style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}` }}
          >
            <span className="text-xs font-medium mb-1" style={{ color: COLORS.inkSoft }}>MOST RECENT READING</span>
            <Gauge systolic={latest.systolic} diastolic={latest.diastolic} />
            <div
              style={{ fontFamily: "'Space Grotesk', sans-serif", color: COLORS.ink }}
              className="text-3xl font-bold -mt-2"
            >
              {latest.systolic}/{latest.diastolic}
            </div>
            <div className="flex items-center gap-3 mt-1">
              <span
                className="text-xs font-semibold px-2 py-0.5 rounded-full"
                style={{ background: latestZone.color + "22", color: latestZone.color }}
              >
                {latestZone.label}
              </span>
              <span className="text-xs" style={{ color: COLORS.inkSoft }}>
                Pulse {latest.pulse} bpm · {latest.date}
              </span>
            </div>
          </div>
        )}

        <form
          onSubmit={handleAddReading}
          className="rounded-2xl p-5 mb-5"
          style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}` }}
        >
          <div className="flex items-center gap-2 mb-3">
            <Activity size={16} color={COLORS.primary} />
            <span className="text-sm font-semibold" style={{ color: COLORS.ink }}>Log a reading</span>
          </div>
          <div className="grid grid-cols-3 gap-3 mb-3">
            <div>
              <label className="text-xs block mb-1" style={{ color: COLORS.inkSoft }}>Systolic</label>
              <input
                type="number"
                required
                value={sys}
                onChange={(e) => setSys(e.target.value)}
                placeholder="120"
                className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                style={{ background: COLORS.surfaceAlt, border: `1px solid ${COLORS.border}`, color: COLORS.ink }}
              />
            </div>
            <div>
              <label className="text-xs block mb-1" style={{ color: COLORS.inkSoft }}>Diastolic</label>
              <input
                type="number"
                required
                value={dia}
                onChange={(e) => setDia(e.target.value)}
                placeholder="80"
                className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                style={{ background: COLORS.surfaceAlt, border: `1px solid ${COLORS.border}`, color: COLORS.ink }}
              />
            </div>
            <div>
              <label className="text-xs block mb-1" style={{ color: COLORS.inkSoft }}>Pulse</label>
              <input
                type="number"
                required
                value={pulse}
                onChange={(e) => setPulse(e.target.value)}
                placeholder="72"
                className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                style={{ background: COLORS.surfaceAlt, border: `1px solid ${COLORS.border}`, color: COLORS.ink }}
              />
            </div>
          </div>
          <button
            type="submit"
            className="flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg"
            style={{ background: COLORS.ink, color: "#fff" }}
          >
            <Plus size={14} /> Save reading
          </button>
        </form>

        <div
          className="rounded-2xl p-5"
          style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}` }}
        >
          <span className="text-sm font-semibold block mb-3" style={{ color: COLORS.ink }}>History</span>
          <div className="flex flex-col gap-2">
            {[...readings].reverse().map((r) => {
              const z = categorize(r.systolic, r.diastolic);
              return (
                <div
                  key={r.id}
                  className="flex items-center justify-between rounded-lg px-3 py-2"
                  style={{ background: COLORS.surfaceAlt }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full" style={{ background: z.color }} />
                    <div>
                      <div className="text-sm font-medium" style={{ color: COLORS.ink }}>
                        {r.systolic}/{r.diastolic} <span className="text-xs font-normal" style={{ color: COLORS.inkSoft }}>· {r.pulse} bpm</span>
                      </div>
                      <div className="text-xs" style={{ color: COLORS.inkSoft }}>{r.date}</div>
                    </div>
                  </div>
                  <span className="text-xs font-semibold" style={{ color: z.color }}>{z.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {showShare && (
        <div
          className="fixed inset-0 flex items-center justify-center p-4"
          style={{ background: "#16231Faa" }}
          onClick={() => setShowShare(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-2xl p-6"
            style={{ background: COLORS.surface }}
          >
            <div className="flex items-center justify-between mb-4">
              <span
                style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, color: COLORS.ink }}
                className="text-lg"
              >
                Share with doctor
              </span>
              <button onClick={() => setShowShare(false)}>
                <X size={18} color={COLORS.inkSoft} />
              </button>
            </div>

            {!shareSent ? (
              <>
                <p className="text-sm mb-3" style={{ color: COLORS.inkSoft }}>
                  Your doctor will get read-only access to your last {readings.length} readings.
                </p>
                <label className="text-xs block mb-1" style={{ color: COLORS.inkSoft }}>Doctor's email</label>
                <input
                  type="email"
                  value={doctorEmail}
                  onChange={(e) => setDoctorEmail(e.target.value)}
                  placeholder="dr.smith@clinic.com"
                  className="w-full rounded-lg px-3 py-2 text-sm outline-none mb-4"
                  style={{ background: COLORS.surfaceAlt, border: `1px solid ${COLORS.border}`, color: COLORS.ink }}
                />
                <button
                  onClick={sendShare}
                  className="w-full py-2.5 rounded-lg text-sm font-medium"
                  style={{ background: COLORS.primary, color: "#fff" }}
                >
                  Send access
                </button>
              </>
            ) : (
              <>
                <div
                  className="rounded-lg p-3 mb-3 flex items-center gap-2"
                  style={{ background: COLORS.surfaceAlt }}
                >
                  <Check size={16} color={COLORS.primary} />
                  <span className="text-sm" style={{ color: COLORS.ink }}>
                    Shared with {doctorEmail}
                  </span>
                </div>
                <label className="text-xs block mb-1" style={{ color: COLORS.inkSoft }}>Or copy the link</label>
                <div
                  className="flex items-center justify-between rounded-lg px-3 py-2"
                  style={{ background: COLORS.surfaceAlt, border: `1px solid ${COLORS.border}` }}
                >
                  <span className="text-xs truncate" style={{ color: COLORS.inkSoft }}>
                    cuff.app/share/a1b2c3d4
                  </span>
                  <button onClick={copyLink} className="flex-shrink-0 ml-2">
                    {linkCopied ? <Check size={14} color={COLORS.primary} /> : <Copy size={14} color={COLORS.inkSoft} />}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
