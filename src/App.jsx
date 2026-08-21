import { useEffect, useState } from "react";
import { Heart, Share2, LogOut, Plus, Lock, Mail, Activity, Droplet, FileText, Check, User } from "lucide-react";
import { supabase } from "./supabaseClient";

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

const SUGAR_TYPES = [
  { id: "fasting", label: "Fasting", unit: "mg/dL", min: 70, max: 220, breaks: [100, 126] },
  { id: "nonfasting", label: "Non-fasting", unit: "mg/dL", min: 70, max: 260, breaks: [140, 200] },
  { id: "a1c", label: "A1C", unit: "%", min: 4, max: 9, breaks: [5.7, 6.5] },
];

function categorizeBP(sys, dia) {
  if (sys >= 180 || dia >= 120) return { label: "Crisis", color: COLORS.crisis };
  if (sys >= 140 || dia >= 90) return { label: "High, Stage 2", color: COLORS.high };
  if (sys >= 130 || dia >= 80) return { label: "High, Stage 1", color: COLORS.elevated };
  if (sys >= 120) return { label: "Elevated", color: COLORS.elevated };
  return { label: "Normal", color: COLORS.normal };
}

function categorizeSugar(typeId, value) {
  const t = SUGAR_TYPES.find((s) => s.id === typeId);
  const [b1, b2] = t.breaks;
  if (value >= b2) return { label: "Diabetes range", color: COLORS.high };
  if (value >= b1) return { label: "Prediabetes range", color: COLORS.elevated };
  return { label: "Normal", color: COLORS.normal };
}

function pulseZone(bpm) {
  if (bpm < 60) return { label: "Low", color: COLORS.elevated };
  if (bpm > 100) return { label: "Elevated", color: COLORS.high };
  return { label: "Normal", color: COLORS.normal };
}

function daysAgoLabel(iso) {
  if (!iso) return "";
  const raw = new Date(iso);
  const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diff = Math.round((startOfDay(new Date()) - startOfDay(raw)) / 86400000);
  if (diff <= 0) return "Today";
  if (diff === 1) return "Yesterday";
  return `${diff} days ago`;
}

function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" }) +
    ", " + d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

function Card({ children, className = "" }) {
  return (
    <div
      className={`rounded-3xl p-6 mb-5 ${className}`}
      style={{
        background: COLORS.surface,
        border: `1px solid ${COLORS.border}`,
        boxShadow: "0 1px 2px rgba(22,35,31,0.04), 0 10px 24px -14px rgba(22,35,31,0.10)",
      }}
    >
      {children}
    </div>
  );
}

function MetricCard({ label, value, unit, zoneLabel, zoneColor }) {
  return (
    <div className="rounded-2xl p-4 flex-1" style={{ background: COLORS.surfaceAlt }}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold tracking-wide" style={{ color: COLORS.inkSoft }}>
          {label.toUpperCase()}
        </span>
        {zoneLabel && (
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: zoneColor + "1a", color: zoneColor }}>
            {zoneLabel}
          </span>
        )}
      </div>
      <div className="flex items-baseline gap-1.5">
        <span style={{ fontFamily: "'Space Grotesk', sans-serif", color: COLORS.ink }} className="text-2xl font-bold">{value}</span>
        <span className="text-xs" style={{ color: COLORS.inkSoft }}>{unit}</span>
      </div>
    </div>
  );
}

function SugarSummaryCard({ reading }) {
  if (!reading) {
    return (
      <div className="rounded-2xl p-4 flex items-center justify-center flex-1" style={{ background: COLORS.surfaceAlt, border: `1px dashed ${COLORS.border}`, minHeight: 88 }}>
        <span className="text-xs" style={{ color: COLORS.inkSoft }}>No reading yet</span>
      </div>
    );
  }
  const t = SUGAR_TYPES.find((s) => s.id === reading.type);
  const z = categorizeSugar(reading.type, reading.value);
  return (
    <div className="rounded-2xl p-4 flex-1" style={{ background: COLORS.surfaceAlt }}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold tracking-wide" style={{ color: COLORS.inkSoft }}>{t.label.toUpperCase()}</span>
        <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: z.color + "1a", color: z.color }}>{z.label}</span>
      </div>
      <div className="flex items-baseline gap-1.5 mb-2">
        <span style={{ fontFamily: "'Space Grotesk', sans-serif", color: COLORS.ink }} className="text-2xl font-bold">{reading.value}</span>
        <span className="text-xs" style={{ color: COLORS.inkSoft }}>{t.unit}</span>
      </div>
      <div className="text-xs" style={{ color: COLORS.inkSoft }}>{formatDate(reading.created_at)} · {daysAgoLabel(reading.created_at)}</div>
    </div>
  );
}

export default function App() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [authMode, setAuthMode] = useState("signin"); // 'signin' | 'signup'
  const [name, setName] = useState("");
  const [role, setRole] = useState("Patient");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [loading, setLoading] = useState(false);

  const [patients, setPatients] = useState([]);
  const [selectedPatientId, setSelectedPatientId] = useState(null);

  const [bpReadings, setBpReadings] = useState([]);
  const [sugarReadings, setSugarReadings] = useState([]);
  const [prescription, setPrescription] = useState(null);
  const [prescriptionDraft, setPrescriptionDraft] = useState("");
  const [prescriptionSaved, setPrescriptionSaved] = useState(false);

  const [sys, setSys] = useState("");
  const [dia, setDia] = useState("");
  const [pulse, setPulse] = useState("");
  const [fastingValue, setFastingValue] = useState("");
  const [nonFastingValue, setNonFastingValue] = useState("");
  const [a1cValue, setA1cValue] = useState("");

  // Track auth session
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => setSession(session));
    return () => listener.subscription.unsubscribe();
  }, []);

  // Load profile once signed in
  useEffect(() => {
    if (!session) {
      setProfile(null);
      return;
    }
    supabase.from("profiles").select("*").eq("id", session.user.id).single().then(({ data }) => setProfile(data));
  }, [session]);

  // Doctors: load the patient list
  useEffect(() => {
    if (profile?.role === "Doctor") {
      supabase.from("profiles").select("*").eq("role", "Patient").then(({ data }) => {
        setPatients(data || []);
        if (data && data.length > 0 && !selectedPatientId) setSelectedPatientId(data[0].id);
      });
    }
  }, [profile]);

  const activePatientId = profile?.role === "Doctor" ? selectedPatientId : profile?.id;

  // Load readings + prescription whenever the active patient changes
  useEffect(() => {
    if (!activePatientId) return;
    supabase.from("bp_readings").select("*").eq("patient_id", activePatientId).order("created_at", { ascending: true })
      .then(({ data }) => setBpReadings(data || []));
    supabase.from("sugar_readings").select("*").eq("patient_id", activePatientId).order("created_at", { ascending: true })
      .then(({ data }) => setSugarReadings(data || []));
    supabase.from("prescriptions").select("*").eq("patient_id", activePatientId).order("updated_at", { ascending: false }).limit(1)
      .then(({ data }) => {
        const p = data && data[0];
        setPrescription(p || null);
        setPrescriptionDraft(p ? p.text : "");
      });
  }, [activePatientId]);

  const handleAuth = async () => {
    setAuthError("");
    setLoading(true);
    if (authMode === "signup") {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) { setAuthError(error.message); setLoading(false); return; }
      if (data.user) {
        await supabase.from("profiles").insert({ id: data.user.id, name: name || "New user", role });
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) { setAuthError(error.message); setLoading(false); return; }
    }
    setLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const addBpReading = async () => {
    if (!sys || !dia || !pulse) return;
    const { data } = await supabase.from("bp_readings").insert({
      patient_id: profile.id, systolic: parseInt(sys), diastolic: parseInt(dia), pulse: parseInt(pulse),
    }).select();
    if (data) setBpReadings([...bpReadings, ...data]);
    setSys(""); setDia(""); setPulse("");
  };

  const addSugarReadings = async () => {
    const rows = [];
    if (fastingValue) rows.push({ patient_id: profile.id, type: "fasting", value: parseFloat(fastingValue) });
    if (nonFastingValue) rows.push({ patient_id: profile.id, type: "nonfasting", value: parseFloat(nonFastingValue) });
    if (a1cValue) rows.push({ patient_id: profile.id, type: "a1c", value: parseFloat(a1cValue) });
    if (rows.length === 0) return;
    const { data } = await supabase.from("sugar_readings").insert(rows).select();
    if (data) setSugarReadings([...sugarReadings, ...data]);
    setFastingValue(""); setNonFastingValue(""); setA1cValue("");
  };

  const savePrescription = async () => {
    if (!activePatientId) return;
    const { data } = await supabase.from("prescriptions").insert({
      patient_id: activePatientId, doctor_id: profile.id, text: prescriptionDraft,
    }).select();
    if (data) setPrescription(data[0]);
    setPrescriptionSaved(true);
    setTimeout(() => setPrescriptionSaved(false), 1800);
  };

  const latestBp = bpReadings[bpReadings.length - 1];
  const latestBpZone = latestBp ? categorizeBP(latestBp.systolic, latestBp.diastolic) : null;
  const latestFasting = [...sugarReadings].reverse().find((r) => r.type === "fasting");
  const latestNonFasting = [...sugarReadings].reverse().find((r) => r.type === "nonfasting");
  const latestA1c = [...sugarReadings].reverse().find((r) => r.type === "a1c");

  // ---------- AUTH SCREEN ----------
  if (!session || !profile) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center p-6" style={{ background: COLORS.bg }}>
        <div className="w-full max-w-sm rounded-3xl p-9" style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, boxShadow: "0 30px 60px -20px rgba(22,35,31,0.20)" }}>
          <div className="flex flex-col items-center mb-8">
            <div className="w-14 h-14 rounded-full flex items-center justify-center mb-4" style={{ background: `linear-gradient(155deg, ${COLORS.primarySoft}, ${COLORS.primary})` }}>
              <Heart size={24} color="#fff" fill="#ffffff33" />
            </div>
            <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, color: COLORS.ink }} className="text-3xl">Cuff</h1>
            <p className="text-sm mt-2 text-center" style={{ color: COLORS.inkSoft }}>Log your readings. Share them with your doctor.</p>
          </div>

          <div className="flex rounded-xl overflow-hidden mb-5" style={{ border: `1px solid ${COLORS.border}` }}>
            <button onClick={() => setAuthMode("signin")} className="flex-1 py-2 text-xs font-semibold" style={authMode === "signin" ? { background: COLORS.ink, color: "#fff" } : { background: COLORS.surfaceAlt, color: COLORS.inkSoft }}>Sign in</button>
            <button onClick={() => setAuthMode("signup")} className="flex-1 py-2 text-xs font-semibold" style={authMode === "signup" ? { background: COLORS.ink, color: "#fff" } : { background: COLORS.surfaceAlt, color: COLORS.inkSoft }}>Sign up</button>
          </div>

          {authMode === "signup" && (
            <>
              <label className="text-xs font-medium block mb-1.5" style={{ color: COLORS.inkSoft }}>FULL NAME</label>
              <div className="flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 mb-4" style={{ background: COLORS.surfaceAlt, border: `1px solid ${COLORS.border}` }}>
                <User size={16} color={COLORS.inkSoft} />
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Alex Rivera" className="bg-transparent outline-none text-sm w-full" style={{ color: COLORS.ink }} />
              </div>
              <label className="text-xs font-medium block mb-1.5" style={{ color: COLORS.inkSoft }}>I AM A</label>
              <div className="flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 mb-4" style={{ background: COLORS.surfaceAlt, border: `1px solid ${COLORS.border}` }}>
                <select value={role} onChange={(e) => setRole(e.target.value)} className="bg-transparent outline-none text-sm w-full" style={{ color: COLORS.ink }}>
                  <option value="Patient">Patient</option>
                  <option value="Doctor">Doctor</option>
                </select>
              </div>
            </>
          )}

          <label className="text-xs font-medium block mb-1.5" style={{ color: COLORS.inkSoft }}>EMAIL</label>
          <div className="flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 mb-4" style={{ background: COLORS.surfaceAlt, border: `1px solid ${COLORS.border}` }}>
            <Mail size={16} color={COLORS.inkSoft} />
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="bg-transparent outline-none text-sm w-full" style={{ color: COLORS.ink }} />
          </div>

          <label className="text-xs font-medium block mb-1.5" style={{ color: COLORS.inkSoft }}>PASSWORD</label>
          <div className="flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 mb-2" style={{ background: COLORS.surfaceAlt, border: `1px solid ${COLORS.border}` }}>
            <Lock size={16} color={COLORS.inkSoft} />
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 6 characters" className="bg-transparent outline-none text-sm w-full" style={{ color: COLORS.ink }} />
          </div>

          {authError && <p className="text-xs mb-3" style={{ color: COLORS.high }}>{authError}</p>}

          <button onClick={handleAuth} disabled={loading} className="w-full py-3 mt-4 rounded-xl text-sm font-semibold" style={{ background: `linear-gradient(155deg, ${COLORS.primarySoft}, ${COLORS.primary})`, color: "#fff" }}>
            {loading ? "Please wait..." : authMode === "signup" ? "Create account" : "Sign in"}
          </button>
        </div>
      </div>
    );
  }

  // ---------- DASHBOARD ----------
  return (
    <div className="min-h-screen w-full" style={{ background: COLORS.bg }}>
      <div className="max-w-2xl mx-auto p-5">
        <div className="flex items-center justify-between mb-7">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: `linear-gradient(155deg, ${COLORS.primarySoft}, ${COLORS.primary})` }}>
              <Heart size={16} color="#fff" fill="#ffffff33" />
            </div>
            <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, color: COLORS.ink }} className="text-xl">Cuff</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium hidden sm:inline" style={{ color: COLORS.ink }}>{profile.name} · {profile.role}</span>
            <button onClick={handleLogout} className="flex items-center gap-1.5 text-sm px-3.5 py-2 rounded-xl" style={{ background: COLORS.surface, color: COLORS.inkSoft, border: `1px solid ${COLORS.border}` }}>
              <LogOut size={14} /> Log out
            </button>
          </div>
        </div>

        {profile.role === "Doctor" && (
          <Card>
            <label className="text-xs font-semibold block mb-2" style={{ color: COLORS.inkSoft }}>VIEWING PATIENT</label>
            <select value={selectedPatientId || ""} onChange={(e) => setSelectedPatientId(e.target.value)} className="w-full rounded-xl px-3.5 py-2.5 text-sm outline-none" style={{ background: COLORS.surfaceAlt, border: `1px solid ${COLORS.border}`, color: COLORS.ink }}>
              {patients.length === 0 && <option>No patients yet</option>}
              {patients.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </Card>
        )}

        <Card>
          <div className="flex items-center gap-2 mb-4">
            <FileText size={16} color={COLORS.primary} />
            <span className="text-sm font-semibold" style={{ color: COLORS.ink }}>Prescription</span>
          </div>
          {profile.role === "Doctor" ? (
            <>
              <textarea value={prescriptionDraft} onChange={(e) => setPrescriptionDraft(e.target.value)} rows={4} className="w-full rounded-xl px-3.5 py-3 text-sm outline-none mb-3 resize-none" style={{ background: COLORS.surfaceAlt, border: `1px solid ${COLORS.border}`, color: COLORS.ink }} placeholder="Write instructions for your patient..." />
              <button onClick={savePrescription} className="flex items-center gap-1.5 text-sm px-4 py-2.5 rounded-xl font-medium" style={{ background: COLORS.ink, color: "#fff" }}>
                {prescriptionSaved ? <Check size={14} /> : <Plus size={14} />} {prescriptionSaved ? "Saved" : "Save prescription"}
              </button>
            </>
          ) : (
            <p className="text-sm leading-relaxed" style={{ color: COLORS.ink }}>{prescription ? prescription.text : "No prescription yet."}</p>
          )}
        </Card>

        {(latestFasting || latestNonFasting || latestA1c) && (
          <Card>
            <div className="flex items-center gap-2 mb-4">
              <Droplet size={16} color={COLORS.primary} />
              <span className="text-sm font-semibold" style={{ color: COLORS.ink }}>Blood sugar</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <SugarSummaryCard reading={latestFasting} />
              <SugarSummaryCard reading={latestNonFasting} />
              <SugarSummaryCard reading={latestA1c} />
            </div>
          </Card>
        )}

        {latestBp && (
          <Card>
            <div className="flex items-center gap-2 mb-4">
              <Heart size={16} color={COLORS.primary} />
              <span className="text-sm font-semibold" style={{ color: COLORS.ink }}>Blood pressure</span>
            </div>
            <div className="rounded-2xl py-6 mb-4 flex flex-col items-center" style={{ background: COLORS.surfaceAlt }}>
              <span className="text-xs font-semibold mb-2" style={{ color: COLORS.inkSoft }}>MOST RECENT READING</span>
              <div style={{ fontFamily: "'Space Grotesk', sans-serif", color: COLORS.ink }} className="text-5xl font-bold">
                {latestBp.systolic}<span style={{ color: COLORS.inkSoft, fontWeight: 500 }}>/{latestBp.diastolic}</span>
              </div>
              <div className="flex items-center gap-3 mt-2">
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: latestBpZone.color + "1a", color: latestBpZone.color }}>{latestBpZone.label}</span>
                <span className="text-xs" style={{ color: COLORS.inkSoft }}>{formatDate(latestBp.created_at)} · {daysAgoLabel(latestBp.created_at)}</span>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <MetricCard label="Systolic" value={latestBp.systolic} unit="mmHg" zoneLabel={latestBpZone.label} zoneColor={latestBpZone.color} />
              <MetricCard label="Diastolic" value={latestBp.diastolic} unit="mmHg" zoneLabel={latestBpZone.label} zoneColor={latestBpZone.color} />
              <MetricCard label="Pulse" value={latestBp.pulse} unit="bpm" zoneLabel={pulseZone(latestBp.pulse).label} zoneColor={pulseZone(latestBp.pulse).color} />
            </div>
          </Card>
        )}

        {profile.role === "Patient" && (
          <Card>
            <div className="flex items-center gap-2 mb-4">
              <Activity size={16} color={COLORS.primary} />
              <span className="text-sm font-semibold" style={{ color: COLORS.ink }}>Log blood pressure</span>
            </div>
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div><label className="text-xs block mb-1.5" style={{ color: COLORS.inkSoft }}>Systolic</label>
                <input type="number" value={sys} onChange={(e) => setSys(e.target.value)} placeholder="120" className="w-full rounded-xl px-3 py-2.5 text-sm outline-none text-center" style={{ background: COLORS.surfaceAlt, border: `1px solid ${COLORS.border}`, color: COLORS.ink }} /></div>
              <div><label className="text-xs block mb-1.5" style={{ color: COLORS.inkSoft }}>Diastolic</label>
                <input type="number" value={dia} onChange={(e) => setDia(e.target.value)} placeholder="80" className="w-full rounded-xl px-3 py-2.5 text-sm outline-none text-center" style={{ background: COLORS.surfaceAlt, border: `1px solid ${COLORS.border}`, color: COLORS.ink }} /></div>
              <div><label className="text-xs block mb-1.5" style={{ color: COLORS.inkSoft }}>Pulse</label>
                <input type="number" value={pulse} onChange={(e) => setPulse(e.target.value)} placeholder="72" className="w-full rounded-xl px-3 py-2.5 text-sm outline-none text-center" style={{ background: COLORS.surfaceAlt, border: `1px solid ${COLORS.border}`, color: COLORS.ink }} /></div>
            </div>
            <button onClick={addBpReading} className="flex items-center gap-1.5 text-sm px-4 py-2.5 rounded-xl font-medium" style={{ background: COLORS.ink, color: "#fff" }}>
              <Plus size={14} /> Save blood pressure
            </button>
          </Card>
        )}

        {profile.role === "Patient" && (
          <Card>
            <div className="flex items-center gap-2 mb-4">
              <Droplet size={16} color={COLORS.primary} />
              <span className="text-sm font-semibold" style={{ color: COLORS.ink }}>Log blood sugar</span>
            </div>
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div><label className="text-xs block mb-1.5" style={{ color: COLORS.inkSoft }}>Fasting (mg/dL)</label>
                <input type="number" value={fastingValue} onChange={(e) => setFastingValue(e.target.value)} placeholder="95" className="w-full rounded-xl px-3 py-2.5 text-sm outline-none text-center" style={{ background: COLORS.surfaceAlt, border: `1px solid ${COLORS.border}`, color: COLORS.ink }} /></div>
              <div><label className="text-xs block mb-1.5" style={{ color: COLORS.inkSoft }}>Non-fasting (mg/dL)</label>
                <input type="number" value={nonFastingValue} onChange={(e) => setNonFastingValue(e.target.value)} placeholder="130" className="w-full rounded-xl px-3 py-2.5 text-sm outline-none text-center" style={{ background: COLORS.surfaceAlt, border: `1px solid ${COLORS.border}`, color: COLORS.ink }} /></div>
              <div><label className="text-xs block mb-1.5" style={{ color: COLORS.inkSoft }}>A1C (%)</label>
                <input type="number" step="0.1" value={a1cValue} onChange={(e) => setA1cValue(e.target.value)} placeholder="5.6" className="w-full rounded-xl px-3 py-2.5 text-sm outline-none text-center" style={{ background: COLORS.surfaceAlt, border: `1px solid ${COLORS.border}`, color: COLORS.ink }} /></div>
            </div>
            <button onClick={addSugarReadings} className="flex items-center gap-1.5 text-sm px-4 py-2.5 rounded-xl font-medium" style={{ background: COLORS.ink, color: "#fff" }}>
              <Plus size={14} /> Save blood sugar
            </button>
          </Card>
        )}
      </div>
    </div>
  );
}
