import { useEffect, useState } from "react";
import {
  Heart,
  Share2,
  LogOut,
  Plus,
  Lock,
  Mail,
  Activity,
  Droplet,
  FileText,
  Check,
  User,
  Scale,
  Footprints,
  Dumbbell,
  Moon,
  HeartPulse,
  ArrowLeft,
  Home,
  FlaskConical,
  Stethoscope,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
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
  muted: "#C3CBC6",
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
  if (!t) return { label: "Normal", color: COLORS.normal };
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
  return (
    d.toLocaleDateString(undefined, { month: "short", day: "numeric" }) +
    ", " +
    d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })
  );
}

function shortDate(iso) {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const MEDICAL_FIELDS = [
  { key: "current_diagnoses", label: "Current diagnoses" },
  { key: "previous_diagnoses", label: "Previous diagnoses" },
  { key: "previous_surgeries", label: "Previous surgeries" },
  { key: "hospitalisations", label: "Hospitalisations" },
  { key: "major_illnesses", label: "Major illnesses" },
  { key: "medical_family_history", label: "Family history" },
  { key: "previous_thrombotic_events", label: "Previous thrombotic events" },
  { key: "cardiovascular_history", label: "Cardiovascular history" },
  { key: "diabetes", label: "Diabetes" },
  { key: "hypertension", label: "Hypertension" },
  { key: "thyroid_disease", label: "Thyroid disease" },
  { key: "kidney_disease", label: "Kidney disease" },
  { key: "liver_disease", label: "Liver disease" },
  { key: "cancer_history", label: "Cancer history" },
  { key: "autoimmune_disease", label: "Autoimmune disease" },
  { key: "mental_health_history", label: "Mental-health history" },
];

function formatDOBForInput(isoDate) {
  if (!isoDate) return "";
  const d = new Date(isoDate + "T00:00:00");
  const day = String(d.getDate()).padStart(2, "0");
  return `${day}-${MONTHS[d.getMonth()]}-${d.getFullYear()}`;
}

function parseDOBInput(str) {
  if (!str) return null;
  const m = str.trim().match(/^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/);
  if (!m) return null;
  const day = parseInt(m[1], 10);
  const monthIndex = MONTHS.findIndex((mo) => mo.toLowerCase() === m[2].toLowerCase());
  const year = parseInt(m[3], 10);
  if (monthIndex === -1 || day < 1 || day > 31) return null;
  return `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function calcAge(isoDate) {
  if (!isoDate) return null;
  const dob = new Date(isoDate + "T00:00:00");
  const now = new Date();
  let years = now.getFullYear() - dob.getFullYear();
  let months = now.getMonth() - dob.getMonth();
  if (now.getDate() < dob.getDate()) months--;
  if (months < 0) {
    years--;
    months += 12;
  }
  if (years < 0) return null;
  return { years, months };
}

function HistoryBarChart({ data, dataKey, colorForEntry, unit = "", height = 160, showAxis = true, maxBarSize = 28 }) {
  if (!data || data.length === 0) return null;
  const chartData = data.map((d) => ({ ...d, _label: shortDate(d.created_at) }));
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={chartData} margin={{ top: 8, right: 4, left: 4, bottom: 0 }}>
        {showAxis && <XAxis dataKey="_label" tick={{ fontSize: 10, fill: COLORS.inkSoft }} axisLine={false} tickLine={false} />}
        <YAxis hide />
        <Tooltip
          cursor={{ fill: COLORS.surfaceAlt }}
          contentStyle={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 10, fontSize: 12 }}
          formatter={(value) => [`${value}${unit}`, ""]}
          labelStyle={{ color: COLORS.ink, fontWeight: 600 }}
        />
        <Bar dataKey={dataKey} radius={[6, 6, 0, 0]} maxBarSize={maxBarSize}>
          {chartData.map((entry, i) => (
            <Cell key={i} fill={colorForEntry(entry, i, chartData)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
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
        <span style={{ fontFamily: "'Space Grotesk', sans-serif", color: COLORS.ink }} className="text-2xl font-bold">
          {value}
        </span>
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
        <span className="text-xs font-semibold tracking-wide" style={{ color: COLORS.inkSoft }}>{t?.label?.toUpperCase() || "SUGAR"}</span>
        <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: z.color + "1a", color: z.color }}>{z.label}</span>
      </div>
      <div className="flex items-baseline gap-1.5 mb-2">
        <span style={{ fontFamily: "'Space Grotesk', sans-serif", color: COLORS.ink }} className="text-2xl font-bold">{reading.value}</span>
        <span className="text-xs" style={{ color: COLORS.inkSoft }}>{t?.unit}</span>
      </div>
      <div className="text-xs" style={{ color: COLORS.inkSoft }}>{formatDate(reading.created_at)} · {daysAgoLabel(reading.created_at)}</div>
    </div>
  );
}

export default function App() {
  const [session, setSession] = useState(null);
  const [page, setPage] = useState("dashboard"); // 'dashboard' | 'weightHistory'
  const [activeTab, setActiveTab] = useState("home"); // 'home' | 'activity' | 'lab' | 'doctor' | 'profile'
  const [profileSubTab, setProfileSubTab] = useState("personal"); // 'personal' | 'medical' | 'family'
  const [personalDraft, setPersonalDraft] = useState({
    first_name: "", last_name: "", occupation: "", contact_email: "",
    phone_country_code: "", phone_number: "", date_of_birth: "", sex: "",
    height_ft: "", height_in: "", current_weight_kg: "", city: "", country: "",
    emergency_country_code: "", emergency_number: "", blood_group: "", allergies: "", food_allergies: "",
  });
  const [personalSaved, setPersonalSaved] = useState(false);
  const [medicalFields, setMedicalFields] = useState(
    Object.fromEntries(MEDICAL_FIELDS.map((f) => [f.key, ""]))
  );
  const [medicalDraft, setMedicalDraft] = useState("");
  const [familyDraft, setFamilyDraft] = useState("");
  const [medicalSaved, setMedicalSaved] = useState(false);
  const [familySaved, setFamilySaved] = useState(false);
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
  const [weightReadings, setWeightReadings] = useState([]);
  const [weightValue, setWeightValue] = useState("");
  const [stepsReadings, setStepsReadings] = useState([]);
  const [stepsValue, setStepsValue] = useState("");
  const [workoutReadings, setWorkoutReadings] = useState([]);
  const [workoutWeightValue, setWorkoutWeightValue] = useState("");
  const [workoutCardioValue, setWorkoutCardioValue] = useState("");
  const [sleepReadings, setSleepReadings] = useState([]);
  const [sleepValue, setSleepValue] = useState("");
  const [heartRateReadings, setHeartRateReadings] = useState([]);
  const [hrMinValue, setHrMinValue] = useState("");
  const [hrMaxValue, setHrMaxValue] = useState("");
  const [prescriptions, setPrescriptions] = useState([]);
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
    supabase.from("profiles").select("*").eq("id", session.user.id).single().then(({ data }) => {
      setProfile(data);
      if (data) {
        setMedicalDraft(data.medical_background || "");
        setMedicalFields(Object.fromEntries(MEDICAL_FIELDS.map((f) => [f.key, data[f.key] || ""])));
        setFamilyDraft(data.family_history || "");
        setPersonalDraft({
          first_name: data.first_name || "",
          last_name: data.last_name || "",
          occupation: data.occupation || "",
          contact_email: data.contact_email || "",
          phone_country_code: data.phone_country_code || "",
          phone_number: data.phone_number || "",
          date_of_birth: formatDOBForInput(data.date_of_birth),
          sex: data.sex || "",
          height_ft: data.height_ft ?? "",
          height_in: data.height_in ?? "",
          current_weight_kg: data.current_weight_kg ?? "",
          city: data.city || "",
          country: data.country || "",
          emergency_country_code: data.emergency_country_code || "",
          emergency_number: data.emergency_number || "",
          blood_group: data.blood_group || "",
          allergies: data.allergies || "",
          food_allergies: data.food_allergies || "",
        });
      }
    });
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
    supabase.from("weight_readings").select("*").eq("patient_id", activePatientId).order("created_at", { ascending: true })
      .then(({ data }) => setWeightReadings(data || []));
    supabase.from("steps_readings").select("*").eq("patient_id", activePatientId).order("created_at", { ascending: true })
      .then(({ data }) => setStepsReadings(data || []));
    supabase.from("workout_readings").select("*").eq("patient_id", activePatientId).order("created_at", { ascending: true })
      .then(({ data }) => setWorkoutReadings(data || []));
    supabase.from("sleep_readings").select("*").eq("patient_id", activePatientId).order("created_at", { ascending: true })
      .then(({ data }) => setSleepReadings(data || []));
    supabase.from("heart_rate_readings").select("*").eq("patient_id", activePatientId).order("created_at", { ascending: true })
      .then(({ data }) => setHeartRateReadings(data || []));
    supabase.from("prescriptions").select("*").eq("patient_id", activePatientId).order("updated_at", { ascending: false })
      .then(({ data }) => {
        setPrescriptions(data || []);
        setPrescriptionDraft(data && data[0] ? data[0].text : "");
      });
  }, [activePatientId]);

  const handleAuth = async () => {
    setAuthError("");
    setLoading(true);
    if (authMode === "signup") {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) { setAuthError(error.message); setLoading(false); return; }
      if (data.user) {
        const { data: newProfile } = await supabase
          .from("profiles")
          .insert({ id: data.user.id, name: name || "New user", role })
          .select()
          .single();
        if (newProfile) setProfile(newProfile);
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

  const addWeightReading = async () => {
    if (!weightValue) return;
    const { data } = await supabase.from("weight_readings").insert({
      patient_id: profile.id, value: parseFloat(weightValue), unit: "kg",
    }).select();
    if (data) setWeightReadings([...weightReadings, ...data]);
    setWeightValue("");
  };

  const addStepsReading = async () => {
    if (!stepsValue) return;
    const { data } = await supabase.from("steps_readings").insert({
      patient_id: profile.id, value: parseInt(stepsValue),
    }).select();
    if (data) setStepsReadings([...stepsReadings, ...data]);
    setStepsValue("");
  };

  const addWorkoutReadings = async () => {
    const rows = [];
    if (workoutWeightValue) rows.push({ patient_id: profile.id, type: "weight", minutes: parseInt(workoutWeightValue) });
    if (workoutCardioValue) rows.push({ patient_id: profile.id, type: "cardio", minutes: parseInt(workoutCardioValue) });
    if (rows.length === 0) return;
    const { data } = await supabase.from("workout_readings").insert(rows).select();
    if (data) setWorkoutReadings([...workoutReadings, ...data]);
    setWorkoutWeightValue("");
    setWorkoutCardioValue("");
  };

  const addSleepReading = async () => {
    if (!sleepValue) return;
    const { data } = await supabase.from("sleep_readings").insert({
      patient_id: profile.id, hours: parseFloat(sleepValue),
    }).select();
    if (data) setSleepReadings([...sleepReadings, ...data]);
    setSleepValue("");
  };

  const addHeartRateReading = async () => {
    if (!hrMinValue || !hrMaxValue) return;
    const { data } = await supabase.from("heart_rate_readings").insert({
      patient_id: profile.id, min_bpm: parseInt(hrMinValue), max_bpm: parseInt(hrMaxValue),
    }).select();
    if (data) setHeartRateReadings([...heartRateReadings, ...data]);
    setHrMinValue("");
    setHrMaxValue("");
  };

  const savePersonal = async () => {
    const parsedDOB = parseDOBInput(personalDraft.date_of_birth);
    const payload = {
      ...personalDraft,
      date_of_birth: parsedDOB,
      height_ft: personalDraft.height_ft === "" ? null : parseInt(personalDraft.height_ft),
      height_in: personalDraft.height_in === "" ? null : parseInt(personalDraft.height_in),
      current_weight_kg: personalDraft.current_weight_kg === "" ? null : parseFloat(personalDraft.current_weight_kg),
    };
    const { data } = await supabase.from("profiles").update(payload).eq("id", profile.id).select().single();
    if (data) {
      setProfile(data);
      setPersonalDraft((prev) => ({ ...prev, date_of_birth: formatDOBForInput(data.date_of_birth) }));
    }
    setPersonalSaved(true);
    setTimeout(() => setPersonalSaved(false), 1800);
  };

  const saveMedicalBackground = async () => {
    const { data } = await supabase.from("profiles").update({ ...medicalFields, medical_background: medicalDraft }).eq("id", profile.id).select().single();
    if (data) setProfile(data);
    setMedicalSaved(true);
    setTimeout(() => setMedicalSaved(false), 1800);
  };

  const saveFamilyHistory = async () => {
    const { data } = await supabase.from("profiles").update({ family_history: familyDraft }).eq("id", profile.id).select().single();
    if (data) setProfile(data);
    setFamilySaved(true);
    setTimeout(() => setFamilySaved(false), 1800);
  };

  const savePrescription = async () => {
    if (!activePatientId) return;
    const { data } = await supabase.from("prescriptions").insert({
      patient_id: activePatientId, doctor_id: profile.id, text: prescriptionDraft,
    }).select();
    if (data) setPrescriptions([data[0], ...prescriptions]);
    setPrescriptionSaved(true);
    setTimeout(() => setPrescriptionSaved(false), 1800);
  };

  const currentPrescription = prescriptions[0];
  const pastPrescriptions = prescriptions.slice(1);

  const latestBp = bpReadings[bpReadings.length - 1];
  const latestBpZone = latestBp ? categorizeBP(latestBp.systolic, latestBp.diastolic) : null;
  const latestWeight = weightReadings[weightReadings.length - 1];
  const prevWeight = weightReadings[weightReadings.length - 2];
  const latestSteps = stepsReadings[stepsReadings.length - 1];
  const latestWorkoutWeight = [...workoutReadings].reverse().find((r) => r.type === "weight");
  const latestWorkoutCardio = [...workoutReadings].reverse().find((r) => r.type === "cardio");
  const latestSleep = sleepReadings[sleepReadings.length - 1];
  const latestHeartRate = heartRateReadings[heartRateReadings.length - 1];
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

  // ---------- WEIGHT HISTORY PAGE ----------
  if (page === "weightHistory") {
    return (
      <div className="min-h-screen w-full" style={{ background: COLORS.bg }}>
        <div className="max-w-2xl mx-auto p-5">
          <button
            onClick={() => setPage("dashboard")}
            className="flex items-center gap-1.5 text-sm px-3.5 py-2 rounded-xl mb-5"
            style={{ background: COLORS.surface, color: COLORS.inkSoft, border: `1px solid ${COLORS.border}` }}
          >
            <ArrowLeft size={14} /> Back
          </button>
          <Card>
            <div className="flex items-center gap-2 mb-4">
              <Scale size={16} color={COLORS.primary} />
              <span className="text-lg font-semibold" style={{ color: COLORS.ink, fontFamily: "'Space Grotesk', sans-serif" }}>Body weight history</span>
            </div>
            {weightReadings.length > 0 ? (
              <HistoryBarChart
                data={weightReadings}
                dataKey="value"
                unit={` ${weightReadings[0]?.unit || "kg"}`}
                colorForEntry={() => COLORS.primary}
                height={260}
              />
            ) : (
              <p className="text-sm" style={{ color: COLORS.inkSoft }}>No weight readings yet.</p>
            )}
          </Card>
        </div>
      </div>
    );
  }

  // ---------- DASHBOARD ----------
  const NAV_ITEMS = [
    { id: "home", label: "Home", Icon: Home },
    { id: "activity", label: "Activity", Icon: Activity },
    { id: "lab", label: "Lab", Icon: FlaskConical },
    { id: "doctor", label: "Doctor", Icon: Stethoscope },
    { id: "profile", label: "Profile", Icon: User },
  ];

  return (
    <div className="min-h-screen w-full" style={{ background: COLORS.bg }}>
      <div className="max-w-2xl mx-auto p-5 pb-28">
        <div className="flex items-center justify-between mb-7">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: `linear-gradient(155deg, ${COLORS.primarySoft}, ${COLORS.primary})` }}>
              <Heart size={16} color="#fff" fill="#ffffff33" />
            </div>
            <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, color: COLORS.ink }} className="text-xl">Cuff</span>
          </div>
          <button onClick={handleLogout} className="p-2 rounded-xl text-xs flex items-center gap-1 font-medium" style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, color: COLORS.inkSoft }}>
            <LogOut size={14} /> Logout
          </button>
        </div>

        {/* HOME TAB */}
        {activeTab === "home" && (
          <>
            {latestWeight ? (
              <Card>
                <div className="flex items-center gap-2 mb-4">
                  <Scale size={16} color={COLORS.primary} />
                  <span className="text-lg font-semibold" style={{ color: COLORS.ink, fontFamily: "'Space Grotesk', sans-serif" }}>Body weight</span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col items-center justify-center">
                    <span className="text-xs font-semibold mb-2" style={{ color: COLORS.inkSoft }}>MOST RECENT</span>
                    <div style={{ fontFamily: "'Space Grotesk', sans-serif", color: COLORS.ink }} className="text-4xl font-bold">
                      {latestWeight.value}<span className="text-base" style={{ color: COLORS.inkSoft, fontWeight: 500 }}> {latestWeight.unit}</span>
                    </div>
                    {prevWeight && (
                      <span
                        className="text-xs font-semibold px-2.5 py-1 rounded-full mt-2"
                        style={{
                          background: (latestWeight.value >= prevWeight.value ? COLORS.elevated : COLORS.normal) + "1a",
                          color: latestWeight.value >= prevWeight.value ? COLORS.elevated : COLORS.normal,
                        }}
                      >
                        {latestWeight.value > prevWeight.value ? "+" : ""}{(latestWeight.value - prevWeight.value).toFixed(1)} {latestWeight.unit} vs last
                      </span>
                    )}
                    <span className="text-xs mt-2 text-center" style={{ color: COLORS.inkSoft }}>{formatDate(latestWeight.created_at)} · {daysAgoLabel(latestWeight.created_at)}</span>
                  </div>
                  <div
                    onClick={() => setPage("weightHistory")}
                    className="cursor-pointer rounded-xl transition-transform active:scale-[0.98]"
                  >
                    <span className="text-xs font-semibold block mb-1 text-center" style={{ color: COLORS.inkSoft }}>LAST 5 · TAP FOR MORE</span>
                    <HistoryBarChart
                      data={weightReadings.slice(-5)}
                      dataKey="value"
                      unit={` ${latestWeight.unit}`}
                      colorForEntry={(entry, i, arr) => (i === arr.length - 1 ? COLORS.primary : COLORS.muted)}
                      height={110}
                      showAxis={false}
                      maxBarSize={20}
                    />
                  </div>
                </div>
              </Card>
            ) : (
              <Card>
                <p className="text-sm" style={{ color: COLORS.inkSoft }}>No weight data yet. Log your first reading from the Activity tab.</p>
              </Card>
            )}

            <Card>
              <div className="flex items-center gap-2 mb-4">
                <HeartPulse size={16} color={COLORS.primary} />
                <span className="text-lg font-semibold" style={{ color: COLORS.ink, fontFamily: "'Space Grotesk', sans-serif" }}>Blood Pressure</span>
              </div>
              {latestBp ? (
                <div className="flex gap-3">
                  <MetricCard label="Systolic / Diastolic" value={`${latestBp.systolic}/${latestBp.diastolic}`} unit="mmHg" zoneLabel={latestBpZone?.label} zoneColor={latestBpZone?.color} />
                  <MetricCard label="Pulse" value={latestBp.pulse} unit="bpm" zoneLabel={pulseZone(latestBp.pulse).label} zoneColor={pulseZone(latestBp.pulse).color} />
                </div>
              ) : (
                <p className="text-sm" style={{ color: COLORS.inkSoft }}>No BP readings recorded yet.</p>
              )}
            </Card>
          </>
        )}

        {/* ACTIVITY TAB */}
        {activeTab === "activity" && (
          <>
            <Card>
              <div className="flex items-center gap-2 mb-4">
                <Footprints size={16} color={COLORS.primary} />
                <span className="text-lg font-semibold" style={{ color: COLORS.ink, fontFamily: "'Space Grotesk', sans-serif" }}>Log Daily Activity</span>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div>
                  <label className="text-xs font-semibold block mb-1" style={{ color: COLORS.inkSoft }}>STEPS</label>
                  <input type="number" value={stepsValue} onChange={(e) => setStepsValue(e.target.value)} placeholder="8000" className="w-full p-2.5 rounded-xl text-sm outline-none" style={{ background: COLORS.surfaceAlt, border: `1px solid ${COLORS.border}`, color: COLORS.ink }} />
                </div>
                <div>
                  <label className="text-xs font-semibold block mb-1" style={{ color: COLORS.inkSoft }}>SLEEP (HOURS)</label>
                  <input type="number" step="0.5" value={sleepValue} onChange={(e) => setSleepValue(e.target.value)} placeholder="7.5" className="w-full p-2.5 rounded-xl text-sm outline-none" style={{ background: COLORS.surfaceAlt, border: `1px solid ${COLORS.border}`, color: COLORS.ink }} />
                </div>
              </div>
              <div className="flex gap-2 mb-4">
                <button onClick={addStepsReading} className="flex-1 py-2 rounded-xl text-xs font-semibold" style={{ background: COLORS.primary, color: "#fff" }}>Log Steps</button>
                <button onClick={addSleepReading} className="flex-1 py-2 rounded-xl text-xs font-semibold" style={{ background: COLORS.primary, color: "#fff" }}>Log Sleep</button>
              </div>

              <hr className="my-4" style={{ borderColor: COLORS.border }} />

              <span className="text-xs font-semibold block mb-2" style={{ color: COLORS.inkSoft }}>LOG WEIGHT (KG)</span>
              <div className="flex gap-2">
                <input type="number" step="0.1" value={weightValue} onChange={(e) => setWeightValue(e.target.value)} placeholder="70.5" className="flex-1 p-2.5 rounded-xl text-sm outline-none" style={{ background: COLORS.surfaceAlt, border: `1px solid ${COLORS.border}`, color: COLORS.ink }} />
                <button onClick={addWeightReading} className="px-4 py-2.5 rounded-xl text-xs font-semibold" style={{ background: COLORS.primary, color: "#fff" }}>Save Weight</button>
              </div>
            </Card>
          </>
        )}

        {/* LAB TAB */}
        {activeTab === "lab" && (
          <>
            <Card>
              <div className="flex items-center gap-2 mb-4">
                <Droplet size={16} color={COLORS.primary} />
                <span className="text-lg font-semibold" style={{ color: COLORS.ink, fontFamily: "'Space Grotesk', sans-serif" }}>Blood Sugar & Labs</span>
              </div>
              <div className="grid grid-cols-3 gap-2 mb-4">
                <div>
                  <label className="text-xs font-semibold block mb-1" style={{ color: COLORS.inkSoft }}>FASTING</label>
                  <input type="number" value={fastingValue} onChange={(e) => setFastingValue(e.target.value)} placeholder="mg/dL" className="w-full p-2 rounded-xl text-sm outline-none" style={{ background: COLORS.surfaceAlt, border: `1px solid ${COLORS.border}`, color: COLORS.ink }} />
                </div>
                <div>
                  <label className="text-xs font-semibold block mb-1" style={{ color: COLORS.inkSoft }}>NON-FASTING</label>
                  <input type="number" value={nonFastingValue} onChange={(e) => setNonFastingValue(e.target.value)} placeholder="mg/dL" className="w-full p-2 rounded-xl text-sm outline-none" style={{ background: COLORS.surfaceAlt, border: `1px solid ${COLORS.border}`, color: COLORS.ink }} />
                </div>
                <div>
                  <label className="text-xs font-semibold block mb-1" style={{ color: COLORS.inkSoft }}>A1C (%)</label>
                  <input type="number" step="0.1" value={a1cValue} onChange={(e) => setA1cValue(e.target.value)} placeholder="%" className="w-full p-2 rounded-xl text-sm outline-none" style={{ background: COLORS.surfaceAlt, border: `1px solid ${COLORS.border}`, color: COLORS.ink }} />
                </div>
              </div>
              <button onClick={addSugarReadings} className="w-full py-2.5 rounded-xl text-xs font-semibold" style={{ background: COLORS.primary, color: "#fff" }}>Save Readings</button>
            </Card>

            <div className="flex gap-3">
              <SugarSummaryCard reading={latestFasting} />
              <SugarSummaryCard reading={latestNonFasting} />
            </div>
          </>
        )}

        {/* DOCTOR TAB */}
        {activeTab === "doctor" && (
          <Card>
            <div className="flex items-center gap-2 mb-4">
              <Stethoscope size={16} color={COLORS.primary} />
              <span className="text-lg font-semibold" style={{ color: COLORS.ink, fontFamily: "'Space Grotesk', sans-serif" }}>Prescriptions & Notes</span>
            </div>
            {profile?.role === "Doctor" && (
              <div className="mb-4">
                <label className="text-xs font-semibold block mb-1" style={{ color: COLORS.inkSoft }}>SELECT PATIENT</label>
                <select value={selectedPatientId || ""} onChange={(e) => setSelectedPatientId(e.target.value)} className="w-full p-2.5 rounded-xl text-sm outline-none mb-3" style={{ background: COLORS.surfaceAlt, border: `1px solid ${COLORS.border}`, color: COLORS.ink }}>
                  {patients.map((p) => (
                    <option key={p.id} value={p.id}>{p.name || p.email}</option>
                  ))}
                </select>
                <textarea rows={3} value={prescriptionDraft} onChange={(e) => setPrescriptionDraft(e.target.value)} placeholder="Write prescription instructions here..." className="w-full p-3 rounded-xl text-sm outline-none mb-2" style={{ background: COLORS.surfaceAlt, border: `1px solid ${COLORS.border}`, color: COLORS.ink }} />
                <button onClick={savePrescription} className="py-2 px-4 rounded-xl text-xs font-semibold" style={{ background: COLORS.primary, color: "#fff" }}>
                  {prescriptionSaved ? "Saved!" : "Issue Prescription"}
                </button>
              </div>
            )}
            {currentPrescription ? (
              <div className="p-4 rounded-2xl" style={{ background: COLORS.surfaceAlt }}>
                <p className="text-sm font-medium mb-1" style={{ color: COLORS.ink }}>{currentPrescription.text}</p>
                <span className="text-xs" style={{ color: COLORS.inkSoft }}>Issued on {formatDate(currentPrescription.updated_at || currentPrescription.created_at)}</span>
              </div>
            ) : (
              <p className="text-sm" style={{ color: COLORS.inkSoft }}>No active prescriptions available.</p>
            )}
          </Card>
        )}

        {/* PROFILE TAB */}
        {activeTab === "profile" && (
          <Card>
            <div className="flex items-center gap-2 mb-4">
              <User size={16} color={COLORS.primary} />
              <span className="text-lg font-semibold" style={{ color: COLORS.ink, fontFamily: "'Space Grotesk', sans-serif" }}>User Profile</span>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold block mb-1" style={{ color: COLORS.inkSoft }}>FIRST NAME</label>
                <input type="text" value={personalDraft.first_name} onChange={(e) => setPersonalDraft({ ...personalDraft, first_name: e.target.value })} className="w-full p-2.5 rounded-xl text-sm outline-none" style={{ background: COLORS.surfaceAlt, border: `1px solid ${COLORS.border}`, color: COLORS.ink }} />
              </div>
              <div>
                <label className="text-xs font-semibold block mb-1" style={{ color: COLORS.inkSoft }}>LAST NAME</label>
                <input type="text" value={personalDraft.last_name} onChange={(e) => setPersonalDraft({ ...personalDraft, last_name: e.target.value })} className="w-full p-2.5 rounded-xl text-sm outline-none" style={{ background: COLORS.surfaceAlt, border: `1px solid ${COLORS.border}`, color: COLORS.ink }} />
              </div>
              <button onClick={savePersonal} className="py-2.5 px-5 rounded-xl text-xs font-semibold" style={{ background: COLORS.primary, color: "#fff" }}>
                {personalSaved ? "Saved!" : "Save Profile"}
              </button>
            </div>
          </Card>
        )}
      </div>

      {/* BOTTOM NAVIGATION BAR */}
      <div className="fixed bottom-0 left-0 right-0 max-w-2xl mx-auto p-3 flex justify-around items-center" style={{ background: COLORS.surface, borderTop: `1px solid ${COLORS.border}` }}>
        {NAV_ITEMS.map(({ id, label, Icon }) => {
          const isActive = activeTab === id;
          return (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className="flex flex-col items-center gap-1 transition-colors"
              style={{ color: isActive ? COLORS.primary : COLORS.inkSoft }}
            >
              <Icon size={20} />
              <span className="text-[10px] font-medium">{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
