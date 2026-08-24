import { useEffect, useState } from "react";
import { Heart, Share2, LogOut, Plus, Lock, Mail, Activity, Droplet, FileText, Check, User, Scale, Footprints, Dumbbell, Moon, HeartPulse, ArrowLeft, Home, FlaskConical, Stethoscope, Bell, Send, AlertTriangle, ChevronRight } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
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

const FAMILY_HISTORY_FIELDS = [
  { key: "family_diabetes", label: "Diabetes" },
  { key: "family_hypertension", label: "Hypertension" },
  { key: "family_cad_mi", label: "CAD / MI / Heart attack" },
  { key: "family_stroke", label: "Stroke" },
  { key: "family_cancer", label: "Cancer" },
  { key: "family_thyroid_disease", label: "Thyroid disease" },
  { key: "family_kidney_disease", label: "Kidney disease" },
  { key: "family_liver_disease", label: "Liver disease" },
  { key: "family_dementia", label: "Dementia / Memory loss" },
  { key: "family_obesity", label: "Obesity" },
  { key: "family_longevity", label: "Longevity / Age at death" },
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
  const d = new Date(year, monthIndex, day);
  return `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function calcAge(isoDate) {
  if (!isoDate) return null;
  const dob = new Date(isoDate + "T00:00:00");
  const now = new Date();
  let years = now.getFullYear() - dob.getFullYear();
  let months = now.getMonth() - dob.getMonth();
  if (now.getDate() < dob.getDate()) months--;
  if (months < 0) { years--; months += 12; }
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
        <span style={{ fontFamily: "'Space Grotesk', sans-serif", color: COLORS.ink }} className="text-2xl font-bold">{value}</span>
        <span className="text-xs" style={{ color: COLORS.inkSoft }}>{unit}</span>
      </div>
    </div>
  );
}

function AtAGlanceTile({ Icon, label, value, dotColor, onClick }) {
  return (
    <button onClick={onClick} className="rounded-2xl p-3 flex flex-col gap-2 text-left w-full" style={{ background: COLORS.surfaceAlt, border: `1px solid ${COLORS.border}` }}>
      <div className="flex items-center justify-between">
        <Icon size={14} color={COLORS.inkSoft} />
        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: dotColor }} />
      </div>
      <div>
        <div className="text-sm font-bold truncate" style={{ fontFamily: "'Space Grotesk', sans-serif", color: COLORS.ink }}>{value}</div>
        <div className="text-[10px] font-semibold" style={{ color: COLORS.inkSoft }}>{label}</div>
      </div>
    </button>
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
  const [familyFields, setFamilyFields] = useState(
    Object.fromEntries(FAMILY_HISTORY_FIELDS.map((f) => [f.key, ""]))
  );
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
  const [doctorSubTab, setDoctorSubTab] = useState("prescription"); // 'prescription' | 'messages'
  const [messages, setMessages] = useState([]);
  const [messageDraft, setMessageDraft] = useState("");
  const [doctorHasUnreadMessages, setDoctorHasUnreadMessages] = useState(false);

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
        setFamilyFields(Object.fromEntries(FAMILY_HISTORY_FIELDS.map((f) => [f.key, data[f.key] || ""])));
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
    supabase.from("messages").select("*").eq("patient_id", activePatientId).order("created_at", { ascending: true })
      .then(({ data }) => setMessages(data || []));
  }, [activePatientId]);

  // Doctors: check for any unread patient message across all patients, not just the one currently selected
  useEffect(() => {
    if (profile?.role !== "Doctor") { setDoctorHasUnreadMessages(false); return; }
    let query = supabase.from("messages").select("id").eq("sender_role", "Patient").limit(1);
    if (profile.last_seen_messages_at) query = query.gt("created_at", profile.last_seen_messages_at);
    query.then(({ data }) => setDoctorHasUnreadMessages(!!(data && data.length > 0)));
  }, [profile]);

  // Mark prescriptions/messages as seen once the relevant sub-tab is opened
  useEffect(() => {
    if (!profile || activeTab !== "doctor") return;
    if (doctorSubTab === "messages") markMessagesSeen();
    else if (doctorSubTab === "prescription" && profile.role === "Patient") markPrescriptionsSeen();
  }, [activeTab, doctorSubTab, profile?.id]);

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
    const { data } = await supabase.from("profiles").update({ ...familyFields, family_history: familyDraft }).eq("id", profile.id).select().single();
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

  const sendMessage = async () => {
    if (!messageDraft.trim() || !activePatientId) return;
    const { data } = await supabase.from("messages").insert({
      patient_id: activePatientId, sender_id: profile.id, sender_role: profile.role, text: messageDraft.trim(),
    }).select();
    if (data) setMessages([...messages, ...data]);
    setMessageDraft("");
  };

  const markMessagesSeen = async () => {
    const { data } = await supabase.from("profiles").update({ last_seen_messages_at: new Date().toISOString() }).eq("id", profile.id).select().single();
    if (data) setProfile(data);
  };

  const markPrescriptionsSeen = async () => {
    const { data } = await supabase.from("profiles").update({ last_seen_prescriptions_at: new Date().toISOString() }).eq("id", profile.id).select().single();
    if (data) setProfile(data);
  };

  const handleBellClick = () => {
    setActiveTab("doctor");
    if (profile.role === "Doctor") {
      setDoctorSubTab("messages");
      return;
    }
    const messageUnread = latestMessage && latestMessage.sender_role === "Doctor" &&
      (!profile.last_seen_messages_at || new Date(latestMessage.created_at) > new Date(profile.last_seen_messages_at));
    setDoctorSubTab(messageUnread ? "messages" : "prescription");
  };

  const currentPrescription = prescriptions[0];
  const pastPrescriptions = prescriptions.slice(1);
  const latestMessage = messages[messages.length - 1];
  const patientHasUnread = profile?.role === "Patient" && !!(
    (currentPrescription && (!profile.last_seen_prescriptions_at || new Date(currentPrescription.updated_at) > new Date(profile.last_seen_prescriptions_at))) ||
    (latestMessage && latestMessage.sender_role === "Doctor" && (!profile.last_seen_messages_at || new Date(latestMessage.created_at) > new Date(profile.last_seen_messages_at)))
  );
  const hasUnread = profile?.role === "Doctor" ? doctorHasUnreadMessages : patientHasUnread;

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
  const latestSugarReading = [latestFasting, latestNonFasting, latestA1c]
    .filter(Boolean)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];
  const latestSugarZone = latestSugarReading ? categorizeSugar(latestSugarReading.type, latestSugarReading.value) : null;
  const latestSugarUnit = latestSugarReading ? SUGAR_TYPES.find((s) => s.id === latestSugarReading.type).unit : "";
  const heartRateZoneColor = latestHeartRate
    ? (latestHeartRate.min_bpm < 60 || latestHeartRate.max_bpm > 100 ? COLORS.elevated : COLORS.normal)
    : COLORS.muted;

  const outOfRangeAlerts = [];
  if (latestBp && ["High, Stage 1", "High, Stage 2", "Crisis"].includes(latestBpZone.label)) {
    outOfRangeAlerts.push(`Blood pressure is ${latestBpZone.label.toLowerCase()} (${latestBp.systolic}/${latestBp.diastolic} mmHg)`);
  }
  [latestFasting, latestNonFasting, latestA1c].forEach((r) => {
    if (!r) return;
    const z = categorizeSugar(r.type, r.value);
    if (z.label !== "Normal") {
      const t = SUGAR_TYPES.find((s) => s.id === r.type);
      outOfRangeAlerts.push(`${t.label} sugar is in the ${z.label.toLowerCase()} (${r.value}${t.unit === "%" ? "%" : ` ${t.unit}`})`);
    }
  });

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

            {profile.role === "Patient" && (
              <div className="mt-5 pt-5" style={{ borderTop: `1px solid ${COLORS.border}` }}>
                <label className="text-xs block mb-1.5" style={{ color: COLORS.inkSoft }}>Log body weight (kg)</label>
                <div className="flex items-center gap-2">
                  <input type="number" step="0.1" value={weightValue} onChange={(e) => setWeightValue(e.target.value)} placeholder="75" className="w-full rounded-xl px-3 py-2.5 text-sm outline-none text-center" style={{ background: COLORS.surfaceAlt, border: `1px solid ${COLORS.border}`, color: COLORS.ink }} />
                  <button onClick={addWeightReading} className="flex items-center gap-1.5 text-sm px-4 py-2.5 rounded-xl font-medium flex-shrink-0" style={{ background: COLORS.ink, color: "#fff" }}>
                    <Plus size={14} /> Save
                  </button>
                </div>
              </div>
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
          <button
            onClick={handleBellClick}
            className="relative w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: COLORS.surfaceAlt, border: `1px solid ${COLORS.border}` }}
          >
            <Bell size={16} color={COLORS.inkSoft} />
            {hasUnread && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full" style={{ background: COLORS.high, border: `1.5px solid ${COLORS.surface}` }} />
            )}
          </button>
        </div>

        {activeTab === "home" && (
          <>
            {outOfRangeAlerts.length > 0 && (
              <div className="rounded-2xl p-4 mb-5 flex items-start gap-3" style={{ background: COLORS.high + "14", border: `1px solid ${COLORS.high}` }}>
                <AlertTriangle size={18} color={COLORS.high} className="flex-shrink-0 mt-0.5" />
                <div className="flex flex-col gap-1">
                  {outOfRangeAlerts.map((a, i) => (
                    <span key={i} className="text-sm font-medium" style={{ color: COLORS.high }}>{a}</span>
                  ))}
                </div>
              </div>
            )}

            <Card>
              <div className="grid grid-cols-4 gap-2">
                <AtAGlanceTile
                  Icon={Heart}
                  label="BP"
                  value={latestBp ? `${latestBp.systolic}/${latestBp.diastolic}` : "—"}
                  dotColor={latestBpZone ? latestBpZone.color : COLORS.muted}
                  onClick={() => setActiveTab("lab")}
                />
                <AtAGlanceTile
                  Icon={Droplet}
                  label="Sugar"
                  value={latestSugarReading ? `${latestSugarReading.value}${latestSugarUnit === "%" ? "%" : ""}` : "—"}
                  dotColor={latestSugarZone ? latestSugarZone.color : COLORS.muted}
                  onClick={() => setActiveTab("lab")}
                />
                <AtAGlanceTile
                  Icon={Scale}
                  label="Weight"
                  value={latestWeight ? `${latestWeight.value}${latestWeight.unit}` : "—"}
                  dotColor={latestWeight ? COLORS.normal : COLORS.muted}
                  onClick={() => setPage("weightHistory")}
                />
                <AtAGlanceTile
                  Icon={HeartPulse}
                  label="Heart rate"
                  value={latestHeartRate ? `${latestHeartRate.min_bpm}–${latestHeartRate.max_bpm}` : "—"}
                  dotColor={heartRateZoneColor}
                  onClick={() => setActiveTab("activity")}
                />
              </div>
            </Card>

            {currentPrescription && (
              <div onClick={() => { setActiveTab("doctor"); setDoctorSubTab("prescription"); }} className="cursor-pointer active:scale-[0.99] transition-transform">
                <Card>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <FileText size={16} color={COLORS.primary} className="flex-shrink-0" />
                      <div className="min-w-0">
                        <span className="text-xs font-semibold block" style={{ color: COLORS.inkSoft }}>CURRENT PRESCRIPTION</span>
                        <p className="text-sm truncate" style={{ color: COLORS.ink }}>{currentPrescription.text}</p>
                      </div>
                    </div>
                    <ChevronRight size={16} color={COLORS.inkSoft} className="flex-shrink-0" />
                  </div>
                </Card>
              </div>
            )}

            {profile.role === "Patient" && (
              <Card>
                <span className="text-xs font-semibold tracking-wide block mb-3" style={{ color: COLORS.inkSoft }}>QUICK LOG</span>
                <div className="grid grid-cols-3 gap-2">
                  <button onClick={() => setActiveTab("lab")} className="flex flex-col items-center gap-1.5 py-3 rounded-xl" style={{ background: COLORS.surfaceAlt, border: `1px solid ${COLORS.border}` }}>
                    <Heart size={16} color={COLORS.primary} />
                    <span className="text-xs font-medium" style={{ color: COLORS.ink }}>Log BP</span>
                  </button>
                  <button onClick={() => setActiveTab("lab")} className="flex flex-col items-center gap-1.5 py-3 rounded-xl" style={{ background: COLORS.surfaceAlt, border: `1px solid ${COLORS.border}` }}>
                    <Droplet size={16} color={COLORS.primary} />
                    <span className="text-xs font-medium" style={{ color: COLORS.ink }}>Log sugar</span>
                  </button>
                  <button onClick={() => setPage("weightHistory")} className="flex flex-col items-center gap-1.5 py-3 rounded-xl" style={{ background: COLORS.surfaceAlt, border: `1px solid ${COLORS.border}` }}>
                    <Scale size={16} color={COLORS.primary} />
                    <span className="text-xs font-medium" style={{ color: COLORS.ink }}>Log weight</span>
                  </button>
                </div>
              </Card>
            )}

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
                <p className="text-sm" style={{ color: COLORS.inkSoft }}>No data yet. Log your first reading from the Activity or Lab tab.</p>
              </Card>
            )}
          </>
        )}

        {activeTab === "activity" && (
          <>
            {(latestSteps || latestWorkoutWeight || latestWorkoutCardio || latestSleep || latestHeartRate) && (
              <Card>
                <div className="flex items-center gap-2 mb-4">
                  <Footprints size={16} color={COLORS.primary} />
                  <span className="text-lg font-semibold" style={{ color: COLORS.ink, fontFamily: "'Space Grotesk', sans-serif" }}>Activity</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                  <MetricCard label="Steps" value={latestSteps ? latestSteps.value.toLocaleString() : "—"} unit="today" />
                  <MetricCard label="Sleep" value={latestSleep ? latestSleep.hours : "—"} unit="hrs" />
                  <MetricCard
                    label="Heart rate"
                    value={latestHeartRate ? `${latestHeartRate.min_bpm}–${latestHeartRate.max_bpm}` : "—"}
                    unit="bpm"
                  />
                </div>
                <span className="text-xs font-semibold tracking-wide block mb-2" style={{ color: COLORS.inkSoft }}>WORKOUT MINUTES</span>
                <div className="grid grid-cols-2 gap-3">
                  <MetricCard label="Weight" value={latestWorkoutWeight ? latestWorkoutWeight.minutes : "—"} unit="min" />
                  <MetricCard label="Cardio / Walk" value={latestWorkoutCardio ? latestWorkoutCardio.minutes : "—"} unit="min" />
                </div>
              </Card>
            )}

            {profile.role === "Patient" && (
              <Card>
                <div className="flex items-center gap-2 mb-4">
                  <Footprints size={16} color={COLORS.primary} />
                  <span className="text-sm font-semibold" style={{ color: COLORS.ink }}>Log activity</span>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div>
                    <label className="text-xs block mb-1.5" style={{ color: COLORS.inkSoft }}>Steps</label>
                    <input type="number" value={stepsValue} onChange={(e) => setStepsValue(e.target.value)} placeholder="8000" className="w-full rounded-xl px-3 py-2.5 text-sm outline-none text-center" style={{ background: COLORS.surfaceAlt, border: `1px solid ${COLORS.border}`, color: COLORS.ink }} />
                  </div>
                  <div>
                    <label className="text-xs block mb-1.5" style={{ color: COLORS.inkSoft }}>Sleep (hrs)</label>
                    <input type="number" step="0.1" value={sleepValue} onChange={(e) => setSleepValue(e.target.value)} placeholder="7.5" className="w-full rounded-xl px-3 py-2.5 text-sm outline-none text-center" style={{ background: COLORS.surfaceAlt, border: `1px solid ${COLORS.border}`, color: COLORS.ink }} />
                  </div>
                </div>

                <span className="text-xs font-semibold tracking-wide block mb-2" style={{ color: COLORS.inkSoft }}>WORKOUT MINUTES</span>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div>
                    <label className="text-xs block mb-1.5" style={{ color: COLORS.inkSoft }}>Weight</label>
                    <input type="number" value={workoutWeightValue} onChange={(e) => setWorkoutWeightValue(e.target.value)} placeholder="30" className="w-full rounded-xl px-3 py-2.5 text-sm outline-none text-center" style={{ background: COLORS.surfaceAlt, border: `1px solid ${COLORS.border}`, color: COLORS.ink }} />
                  </div>
                  <div>
                    <label className="text-xs block mb-1.5" style={{ color: COLORS.inkSoft }}>Cardio / Walk</label>
                    <input type="number" value={workoutCardioValue} onChange={(e) => setWorkoutCardioValue(e.target.value)} placeholder="20" className="w-full rounded-xl px-3 py-2.5 text-sm outline-none text-center" style={{ background: COLORS.surfaceAlt, border: `1px solid ${COLORS.border}`, color: COLORS.ink }} />
                  </div>
                </div>

                <span className="text-xs font-semibold tracking-wide block mb-2" style={{ color: COLORS.inkSoft }}>DAILY HEART RATE</span>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div>
                    <label className="text-xs block mb-1.5" style={{ color: COLORS.inkSoft }}>Min (bpm)</label>
                    <input type="number" value={hrMinValue} onChange={(e) => setHrMinValue(e.target.value)} placeholder="58" className="w-full rounded-xl px-3 py-2.5 text-sm outline-none text-center" style={{ background: COLORS.surfaceAlt, border: `1px solid ${COLORS.border}`, color: COLORS.ink }} />
                  </div>
                  <div>
                    <label className="text-xs block mb-1.5" style={{ color: COLORS.inkSoft }}>Max (bpm)</label>
                    <input type="number" value={hrMaxValue} onChange={(e) => setHrMaxValue(e.target.value)} placeholder="142" className="w-full rounded-xl px-3 py-2.5 text-sm outline-none text-center" style={{ background: COLORS.surfaceAlt, border: `1px solid ${COLORS.border}`, color: COLORS.ink }} />
                  </div>
                </div>

                <button
                  onClick={() => { addStepsReading(); addWorkoutReadings(); addSleepReading(); addHeartRateReading(); }}
                  className="flex items-center gap-1.5 text-sm px-4 py-2.5 rounded-xl font-medium"
                  style={{ background: COLORS.ink, color: "#fff" }}
                >
                  <Plus size={14} /> Save activity
                </button>
              </Card>
            )}

            {stepsReadings.length > 0 && (
              <Card>
                <span className="text-lg font-semibold block mb-3" style={{ color: COLORS.ink, fontFamily: "'Space Grotesk', sans-serif" }}>Steps history</span>
                <HistoryBarChart data={stepsReadings} dataKey="value" unit=" steps" colorForEntry={() => COLORS.primary} />
              </Card>
            )}

            {workoutReadings.length > 0 && (
              <Card>
                <span className="text-lg font-semibold block mb-3" style={{ color: COLORS.ink, fontFamily: "'Space Grotesk', sans-serif" }}>Workout minutes history</span>
                <div className="flex flex-col gap-5">
                  {["weight", "cardio"].map((type) => {
                    const entries = workoutReadings.filter((r) => r.type === type);
                    return (
                      <div key={type}>
                        <span className="text-xs font-semibold tracking-wide block mb-1.5" style={{ color: COLORS.inkSoft }}>
                          {type === "weight" ? "WEIGHT" : "CARDIO / WALK"}
                        </span>
                        {entries.length === 0 ? (
                          <div className="text-xs py-2" style={{ color: COLORS.inkSoft }}>No entries yet</div>
                        ) : (
                          <HistoryBarChart
                            data={entries}
                            dataKey="minutes"
                            unit=" min"
                            colorForEntry={() => (type === "weight" ? COLORS.elevated : COLORS.normal)}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </Card>
            )}

            {sleepReadings.length > 0 && (
              <Card>
                <span className="text-lg font-semibold block mb-3" style={{ color: COLORS.ink, fontFamily: "'Space Grotesk', sans-serif" }}>Sleep history</span>
                <HistoryBarChart data={sleepReadings} dataKey="hours" unit=" hrs" colorForEntry={() => COLORS.primarySoft} />
              </Card>
            )}

            {heartRateReadings.length > 0 && (
              <Card>
                <span className="text-lg font-semibold block mb-3" style={{ color: COLORS.ink, fontFamily: "'Space Grotesk', sans-serif" }}>Heart rate history</span>
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={heartRateReadings.map((r) => ({ ...r, _label: shortDate(r.created_at) }))} margin={{ top: 8, right: 4, left: 4, bottom: 0 }}>
                    <XAxis dataKey="_label" tick={{ fontSize: 10, fill: COLORS.inkSoft }} axisLine={false} tickLine={false} />
                    <YAxis hide />
                    <Tooltip
                      cursor={{ fill: COLORS.surfaceAlt }}
                      contentStyle={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 10, fontSize: 12 }}
                      labelStyle={{ color: COLORS.ink, fontWeight: 600 }}
                    />
                    <Bar dataKey="min_bpm" name="Min" fill={COLORS.normal} radius={[6, 6, 0, 0]} maxBarSize={18} />
                    <Bar dataKey="max_bpm" name="Max" fill={COLORS.high} radius={[6, 6, 0, 0]} maxBarSize={18} />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            )}
          </>
        )}

        {activeTab === "lab" && (
          <>
            {(latestFasting || latestNonFasting || latestA1c) && (
              <Card>
                <div className="flex items-center gap-2 mb-4">
                  <Droplet size={16} color={COLORS.primary} />
                  <span className="text-lg font-semibold" style={{ color: COLORS.ink, fontFamily: "'Space Grotesk', sans-serif" }}>Blood sugar</span>
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
                  <span className="text-lg font-semibold" style={{ color: COLORS.ink, fontFamily: "'Space Grotesk', sans-serif" }}>Blood pressure</span>
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
                  <div><label className="text-xs block mb-1.5" style={{ color: COLORS.inkSoft }}>Fasting</label>
                    <input type="number" value={fastingValue} onChange={(e) => setFastingValue(e.target.value)} placeholder="95" className="w-full rounded-xl px-3 py-2.5 text-sm outline-none text-center" style={{ background: COLORS.surfaceAlt, border: `1px solid ${COLORS.border}`, color: COLORS.ink }} /></div>
                  <div><label className="text-xs block mb-1.5" style={{ color: COLORS.inkSoft }}>Non-fasting</label>
                    <input type="number" value={nonFastingValue} onChange={(e) => setNonFastingValue(e.target.value)} placeholder="130" className="w-full rounded-xl px-3 py-2.5 text-sm outline-none text-center" style={{ background: COLORS.surfaceAlt, border: `1px solid ${COLORS.border}`, color: COLORS.ink }} /></div>
                  <div><label className="text-xs block mb-1.5" style={{ color: COLORS.inkSoft }}>A1C (%)</label>
                    <input type="number" step="0.1" value={a1cValue} onChange={(e) => setA1cValue(e.target.value)} placeholder="5.6" className="w-full rounded-xl px-3 py-2.5 text-sm outline-none text-center" style={{ background: COLORS.surfaceAlt, border: `1px solid ${COLORS.border}`, color: COLORS.ink }} /></div>
                </div>
                <button onClick={addSugarReadings} className="flex items-center gap-1.5 text-sm px-4 py-2.5 rounded-xl font-medium" style={{ background: COLORS.ink, color: "#fff" }}>
                  <Plus size={14} /> Save blood sugar
                </button>
              </Card>
            )}

            {bpReadings.length > 0 && (
              <Card>
                <span className="text-lg font-semibold block mb-3" style={{ color: COLORS.ink, fontFamily: "'Space Grotesk', sans-serif" }}>Blood pressure history</span>
                <HistoryBarChart
                  data={bpReadings}
                  dataKey="systolic"
                  unit=""
                  colorForEntry={(r) => categorizeBP(r.systolic, r.diastolic).color}
                />
              </Card>
            )}

            {sugarReadings.length > 0 && (
              <Card>
                <span className="text-lg font-semibold block mb-3" style={{ color: COLORS.ink, fontFamily: "'Space Grotesk', sans-serif" }}>Blood sugar history</span>
                <div className="flex flex-col gap-5">
                  {SUGAR_TYPES.map((t) => {
                    const entries = sugarReadings.filter((r) => r.type === t.id);
                    return (
                      <div key={t.id}>
                        <span className="text-xs font-semibold tracking-wide block mb-1.5" style={{ color: COLORS.inkSoft }}>{t.label.toUpperCase()}</span>
                        {entries.length === 0 ? (
                          <div className="text-xs py-2" style={{ color: COLORS.inkSoft }}>No readings yet</div>
                        ) : (
                          <HistoryBarChart
                            data={entries}
                            dataKey="value"
                            unit={t.unit === "%" ? "%" : ` ${t.unit}`}
                            colorForEntry={(r) => categorizeSugar(t.id, r.value).color}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </Card>
            )}
          </>
        )}

        {activeTab === "doctor" && (
          <>
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
                <Stethoscope size={16} color={COLORS.primary} />
                <span className="text-lg font-semibold" style={{ color: COLORS.ink, fontFamily: "'Space Grotesk', sans-serif" }}>Doctor</span>
              </div>

              <div
                className="flex gap-2 mb-5 sticky top-0 z-10 -mx-6 px-6 py-2"
                style={{ background: COLORS.surface, borderBottom: `1px solid ${COLORS.border}` }}
              >
                {[
                  { id: "prescription", label: "Prescription" },
                  { id: "messages", label: "Messages" },
                ].map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setDoctorSubTab(t.id)}
                    className="text-xs font-medium px-3 py-1.5 rounded-full transition-colors"
                    style={
                      doctorSubTab === t.id
                        ? { background: COLORS.ink, color: "#fff" }
                        : { background: COLORS.surfaceAlt, color: COLORS.inkSoft, border: `1px solid ${COLORS.border}` }
                    }
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {doctorSubTab === "prescription" && (
                <>
                  {profile.role === "Doctor" && (
                    <>
                      <textarea value={prescriptionDraft} onChange={(e) => setPrescriptionDraft(e.target.value)} rows={4} className="w-full rounded-xl px-3.5 py-3 text-sm outline-none mb-3 resize-none" style={{ background: COLORS.surfaceAlt, border: `1px solid ${COLORS.border}`, color: COLORS.ink }} placeholder="Write instructions for your patient..." />
                      <button onClick={savePrescription} className="flex items-center gap-1.5 text-sm px-4 py-2.5 rounded-xl font-medium mb-5" style={{ background: COLORS.ink, color: "#fff" }}>
                        {prescriptionSaved ? <Check size={14} /> : <Plus size={14} />} {prescriptionSaved ? "Saved" : "Save prescription"}
                      </button>
                    </>
                  )}

                  <div className="mb-4">
                    <span className="text-xs font-semibold tracking-wide block mb-2" style={{ color: COLORS.inkSoft }}>CURRENT</span>
                    {currentPrescription ? (
                      <div className="rounded-xl p-3.5" style={{ background: COLORS.surfaceAlt }}>
                        <p className="text-sm leading-relaxed" style={{ color: COLORS.ink }}>{currentPrescription.text}</p>
                        <div className="text-xs mt-2" style={{ color: COLORS.inkSoft }}>{formatDate(currentPrescription.updated_at)} · {daysAgoLabel(currentPrescription.updated_at)}</div>
                      </div>
                    ) : (
                      <p className="text-sm" style={{ color: COLORS.inkSoft }}>No prescription yet.</p>
                    )}
                  </div>

                  {pastPrescriptions.length > 0 && (
                    <div>
                      <span className="text-xs font-semibold tracking-wide block mb-2" style={{ color: COLORS.inkSoft }}>PAST</span>
                      <div className="flex flex-col gap-2">
                        {pastPrescriptions.map((p) => (
                          <div key={p.id} className="rounded-xl p-3.5" style={{ background: COLORS.surfaceAlt, opacity: 0.75 }}>
                            <p className="text-sm leading-relaxed" style={{ color: COLORS.ink }}>{p.text}</p>
                            <div className="text-xs mt-2" style={{ color: COLORS.inkSoft }}>{formatDate(p.updated_at)} · {daysAgoLabel(p.updated_at)}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}

              {doctorSubTab === "messages" && (
                <>
                  <div className="flex flex-col gap-2.5 mb-4">
                    {messages.length === 0 ? (
                      <p className="text-sm" style={{ color: COLORS.inkSoft }}>No messages yet.</p>
                    ) : (
                      messages.map((m) => {
                        const mine = m.sender_id === profile.id;
                        return (
                          <div
                            key={m.id}
                            className="max-w-[80%] rounded-2xl px-3.5 py-2.5"
                            style={{
                              background: mine ? COLORS.primary : COLORS.surfaceAlt,
                              color: mine ? "#fff" : COLORS.ink,
                              alignSelf: mine ? "flex-end" : "flex-start",
                            }}
                          >
                            <p className="text-sm leading-relaxed">{m.text}</p>
                            <div className="text-[10px] mt-1" style={{ color: mine ? "#ffffffaa" : COLORS.inkSoft }}>
                              {m.sender_role} · {formatDate(m.created_at)}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={messageDraft}
                      onChange={(e) => setMessageDraft(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") sendMessage(); }}
                      placeholder="Write a message..."
                      className="w-full rounded-xl px-3.5 py-2.5 text-sm outline-none"
                      style={{ background: COLORS.surfaceAlt, border: `1px solid ${COLORS.border}`, color: COLORS.ink }}
                    />
                    <button onClick={sendMessage} className="flex items-center gap-1.5 text-sm px-4 py-2.5 rounded-xl font-medium flex-shrink-0" style={{ background: COLORS.ink, color: "#fff" }}>
                      <Send size={14} /> Send
                    </button>
                  </div>
                </>
              )}
            </Card>
          </>
        )}

        {activeTab === "profile" && (
          <Card>
            <div className="flex items-center gap-2 mb-4">
              <User size={16} color={COLORS.primary} />
              <span className="text-lg font-semibold" style={{ color: COLORS.ink, fontFamily: "'Space Grotesk', sans-serif" }}>Profile</span>
            </div>

            <div className="flex items-center justify-between gap-3 rounded-xl p-3.5 mb-5" style={{ background: COLORS.surfaceAlt }}>
              <div>
                <span className="text-xs font-semibold block mb-1" style={{ color: COLORS.inkSoft }}>ROLE</span>
                <span className="text-sm" style={{ color: COLORS.ink }}>{profile.role}</span>
              </div>
              <button onClick={handleLogout} className="flex items-center gap-1.5 text-sm px-4 py-2.5 rounded-xl font-medium flex-shrink-0" style={{ background: COLORS.surface, color: COLORS.inkSoft, border: `1px solid ${COLORS.border}` }}>
                <LogOut size={14} /> Log out
              </button>
            </div>

            <div
              className="flex gap-2 mb-5 sticky top-0 z-10 -mx-6 px-6 py-2"
              style={{ background: COLORS.surface, borderBottom: `1px solid ${COLORS.border}` }}
            >
              {[
                { id: "personal", label: "Personal" },
                { id: "medical", label: "Medical background" },
                { id: "family", label: "Family history" },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setProfileSubTab(t.id)}
                  className="text-xs font-medium px-3 py-1.5 rounded-full transition-colors"
                  style={
                    profileSubTab === t.id
                      ? { background: COLORS.ink, color: "#fff" }
                      : { background: COLORS.surfaceAlt, color: COLORS.inkSoft, border: `1px solid ${COLORS.border}` }
                  }
                >
                  {t.label}
                </button>
              ))}
            </div>

            {profileSubTab === "personal" && (
              <>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="text-xs block mb-1.5" style={{ color: COLORS.inkSoft }}>First name</label>
                    <input type="text" value={personalDraft.first_name} onChange={(e) => setPersonalDraft({ ...personalDraft, first_name: e.target.value })} placeholder="Alex" className="w-full rounded-xl px-3 py-2.5 text-sm outline-none" style={{ background: COLORS.surfaceAlt, border: `1px solid ${COLORS.border}`, color: COLORS.ink }} />
                  </div>
                  <div>
                    <label className="text-xs block mb-1.5" style={{ color: COLORS.inkSoft }}>Last name</label>
                    <input type="text" value={personalDraft.last_name} onChange={(e) => setPersonalDraft({ ...personalDraft, last_name: e.target.value })} placeholder="Rivera" className="w-full rounded-xl px-3 py-2.5 text-sm outline-none" style={{ background: COLORS.surfaceAlt, border: `1px solid ${COLORS.border}`, color: COLORS.ink }} />
                  </div>
                </div>

                <div className="mb-3">
                  <label className="text-xs block mb-1.5" style={{ color: COLORS.inkSoft }}>Occupation</label>
                  <input type="text" value={personalDraft.occupation} onChange={(e) => setPersonalDraft({ ...personalDraft, occupation: e.target.value })} placeholder="Software Engineer" className="w-full rounded-xl px-3 py-2.5 text-sm outline-none" style={{ background: COLORS.surfaceAlt, border: `1px solid ${COLORS.border}`, color: COLORS.ink }} />
                </div>

                <div className="mb-3">
                  <label className="text-xs block mb-1.5" style={{ color: COLORS.inkSoft }}>Email</label>
                  <input type="email" value={personalDraft.contact_email} onChange={(e) => setPersonalDraft({ ...personalDraft, contact_email: e.target.value })} placeholder="alex@example.com" className="w-full rounded-xl px-3 py-2.5 text-sm outline-none" style={{ background: COLORS.surfaceAlt, border: `1px solid ${COLORS.border}`, color: COLORS.ink }} />
                </div>

                <div className="grid grid-cols-3 gap-3 mb-3">
                  <div>
                    <label className="text-xs block mb-1.5" style={{ color: COLORS.inkSoft }}>Country code</label>
                    <input type="text" value={personalDraft.phone_country_code} onChange={(e) => setPersonalDraft({ ...personalDraft, phone_country_code: e.target.value })} placeholder="+1" className="w-full rounded-xl px-3 py-2.5 text-sm outline-none text-center" style={{ background: COLORS.surfaceAlt, border: `1px solid ${COLORS.border}`, color: COLORS.ink }} />
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs block mb-1.5" style={{ color: COLORS.inkSoft }}>Phone number</label>
                    <input type="tel" value={personalDraft.phone_number} onChange={(e) => setPersonalDraft({ ...personalDraft, phone_number: e.target.value })} placeholder="5551234567" className="w-full rounded-xl px-3 py-2.5 text-sm outline-none" style={{ background: COLORS.surfaceAlt, border: `1px solid ${COLORS.border}`, color: COLORS.ink }} />
                  </div>
                </div>

                <div className="mb-3">
                  <label className="text-xs block mb-1.5" style={{ color: COLORS.inkSoft }}>Date of birth (DD-MMM-YYYY)</label>
                  <input type="text" value={personalDraft.date_of_birth} onChange={(e) => setPersonalDraft({ ...personalDraft, date_of_birth: e.target.value })} placeholder="23-Aug-1990" className="w-full rounded-xl px-3 py-2.5 text-sm outline-none" style={{ background: COLORS.surfaceAlt, border: `1px solid ${COLORS.border}`, color: COLORS.ink }} />
                  {(() => {
                    const parsed = parseDOBInput(personalDraft.date_of_birth);
                    const age = parsed ? calcAge(parsed) : null;
                    return age ? (
                      <span className="text-xs mt-1.5 block" style={{ color: COLORS.inkSoft }}>{age.years} years, {age.months} months old</span>
                    ) : personalDraft.date_of_birth ? (
                      <span className="text-xs mt-1.5 block" style={{ color: COLORS.high }}>Format not recognized — use DD-MMM-YYYY, e.g. 23-Aug-1990</span>
                    ) : null;
                  })()}
                </div>

                <div className="mb-3">
                  <label className="text-xs block mb-1.5" style={{ color: COLORS.inkSoft }}>Sex</label>
                  <select value={personalDraft.sex} onChange={(e) => setPersonalDraft({ ...personalDraft, sex: e.target.value })} className="w-full rounded-xl px-3.5 py-2.5 text-sm outline-none" style={{ background: COLORS.surfaceAlt, border: `1px solid ${COLORS.border}`, color: COLORS.ink }}>
                    <option value="">Select...</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Others">Others</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="text-xs block mb-1.5" style={{ color: COLORS.inkSoft }}>Height (ft)</label>
                    <input type="number" value={personalDraft.height_ft} onChange={(e) => setPersonalDraft({ ...personalDraft, height_ft: e.target.value })} placeholder="5" className="w-full rounded-xl px-3 py-2.5 text-sm outline-none text-center" style={{ background: COLORS.surfaceAlt, border: `1px solid ${COLORS.border}`, color: COLORS.ink }} />
                  </div>
                  <div>
                    <label className="text-xs block mb-1.5" style={{ color: COLORS.inkSoft }}>Height (in)</label>
                    <input type="number" value={personalDraft.height_in} onChange={(e) => setPersonalDraft({ ...personalDraft, height_in: e.target.value })} placeholder="9" className="w-full rounded-xl px-3 py-2.5 text-sm outline-none text-center" style={{ background: COLORS.surfaceAlt, border: `1px solid ${COLORS.border}`, color: COLORS.ink }} />
                  </div>
                </div>

                <div className="mb-3">
                  <label className="text-xs block mb-1.5" style={{ color: COLORS.inkSoft }}>Current weight (kg)</label>
                  <div className="flex items-center gap-2">
                    <input type="number" step="0.1" value={personalDraft.current_weight_kg} onChange={(e) => setPersonalDraft({ ...personalDraft, current_weight_kg: e.target.value })} placeholder="75" className="w-full rounded-xl px-3 py-2.5 text-sm outline-none text-center" style={{ background: COLORS.surfaceAlt, border: `1px solid ${COLORS.border}`, color: COLORS.ink }} />
                    <span className="text-xs flex-shrink-0" style={{ color: COLORS.inkSoft }}>kg</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="text-xs block mb-1.5" style={{ color: COLORS.inkSoft }}>City</label>
                    <input type="text" value={personalDraft.city} onChange={(e) => setPersonalDraft({ ...personalDraft, city: e.target.value })} placeholder="Austin" className="w-full rounded-xl px-3 py-2.5 text-sm outline-none" style={{ background: COLORS.surfaceAlt, border: `1px solid ${COLORS.border}`, color: COLORS.ink }} />
                  </div>
                  <div>
                    <label className="text-xs block mb-1.5" style={{ color: COLORS.inkSoft }}>Country</label>
                    <input type="text" value={personalDraft.country} onChange={(e) => setPersonalDraft({ ...personalDraft, country: e.target.value })} placeholder="USA" className="w-full rounded-xl px-3 py-2.5 text-sm outline-none" style={{ background: COLORS.surfaceAlt, border: `1px solid ${COLORS.border}`, color: COLORS.ink }} />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 mb-3">
                  <div>
                    <label className="text-xs block mb-1.5" style={{ color: COLORS.inkSoft }}>Emergency code</label>
                    <input type="text" value={personalDraft.emergency_country_code} onChange={(e) => setPersonalDraft({ ...personalDraft, emergency_country_code: e.target.value })} placeholder="+1" className="w-full rounded-xl px-3 py-2.5 text-sm outline-none text-center" style={{ background: COLORS.surfaceAlt, border: `1px solid ${COLORS.border}`, color: COLORS.ink }} />
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs block mb-1.5" style={{ color: COLORS.inkSoft }}>Emergency contact number</label>
                    <input type="tel" value={personalDraft.emergency_number} onChange={(e) => setPersonalDraft({ ...personalDraft, emergency_number: e.target.value })} placeholder="5559876543" className="w-full rounded-xl px-3 py-2.5 text-sm outline-none" style={{ background: COLORS.surfaceAlt, border: `1px solid ${COLORS.border}`, color: COLORS.ink }} />
                  </div>
                </div>

                <div className="mb-3">
                  <label className="text-xs block mb-1.5" style={{ color: COLORS.inkSoft }}>Blood group</label>
                  <input type="text" value={personalDraft.blood_group} onChange={(e) => setPersonalDraft({ ...personalDraft, blood_group: e.target.value })} placeholder="O+" className="w-full rounded-xl px-3 py-2.5 text-sm outline-none" style={{ background: COLORS.surfaceAlt, border: `1px solid ${COLORS.border}`, color: COLORS.ink }} />
                </div>

                <div className="mb-3">
                  <label className="text-xs block mb-1.5" style={{ color: COLORS.inkSoft }}>Allergies</label>
                  <textarea value={personalDraft.allergies} onChange={(e) => setPersonalDraft({ ...personalDraft, allergies: e.target.value })} rows={2} placeholder="Penicillin, pollen, ..." className="w-full rounded-xl px-3.5 py-3 text-sm outline-none resize-none" style={{ background: COLORS.surfaceAlt, border: `1px solid ${COLORS.border}`, color: COLORS.ink }} />
                </div>

                <div className="mb-4">
                  <label className="text-xs block mb-1.5" style={{ color: COLORS.inkSoft }}>Food allergies / Intolerance</label>
                  <textarea value={personalDraft.food_allergies} onChange={(e) => setPersonalDraft({ ...personalDraft, food_allergies: e.target.value })} rows={2} placeholder="Peanuts, lactose, gluten, ..." className="w-full rounded-xl px-3.5 py-3 text-sm outline-none resize-none" style={{ background: COLORS.surfaceAlt, border: `1px solid ${COLORS.border}`, color: COLORS.ink }} />
                </div>

                <button onClick={savePersonal} className="flex items-center gap-1.5 text-sm px-4 py-2.5 rounded-xl font-medium" style={{ background: COLORS.ink, color: "#fff" }}>
                  {personalSaved ? <Check size={14} /> : <Plus size={14} />} {personalSaved ? "Saved" : "Save"}
                </button>
              </>
            )}

            {profileSubTab === "medical" && (
              <>
                {MEDICAL_FIELDS.map((f) => (
                  <div className="mb-3" key={f.key}>
                    <label className="text-xs block mb-1.5" style={{ color: COLORS.inkSoft }}>{f.label}</label>
                    <textarea
                      value={medicalFields[f.key]}
                      onChange={(e) => setMedicalFields({ ...medicalFields, [f.key]: e.target.value })}
                      rows={2}
                      className="w-full rounded-xl px-3.5 py-2.5 text-sm outline-none resize-none"
                      style={{ background: COLORS.surfaceAlt, border: `1px solid ${COLORS.border}`, color: COLORS.ink }}
                      placeholder="None"
                    />
                  </div>
                ))}

                <div className="mb-4">
                  <label className="text-xs block mb-1.5" style={{ color: COLORS.inkSoft }}>Additional notes</label>
                  <textarea
                    value={medicalDraft}
                    onChange={(e) => setMedicalDraft(e.target.value)}
                    rows={4}
                    className="w-full rounded-xl px-3.5 py-3 text-sm outline-none resize-none"
                    style={{ background: COLORS.surfaceAlt, border: `1px solid ${COLORS.border}`, color: COLORS.ink }}
                    placeholder="Anything else worth noting..."
                  />
                </div>

                <button onClick={saveMedicalBackground} className="flex items-center gap-1.5 text-sm px-4 py-2.5 rounded-xl font-medium" style={{ background: COLORS.ink, color: "#fff" }}>
                  {medicalSaved ? <Check size={14} /> : <Plus size={14} />} {medicalSaved ? "Saved" : "Save"}
                </button>
              </>
            )}

            {profileSubTab === "family" && (
              <>
                {FAMILY_HISTORY_FIELDS.map((f) => (
                  <div className="mb-3" key={f.key}>
                    <label className="text-xs block mb-1.5" style={{ color: COLORS.inkSoft }}>{f.label}</label>
                    <textarea
                      value={familyFields[f.key]}
                      onChange={(e) => setFamilyFields({ ...familyFields, [f.key]: e.target.value })}
                      rows={2}
                      className="w-full rounded-xl px-3.5 py-2.5 text-sm outline-none resize-none"
                      style={{ background: COLORS.surfaceAlt, border: `1px solid ${COLORS.border}`, color: COLORS.ink }}
                      placeholder="None"
                    />
                  </div>
                ))}

                <div className="mb-4">
                  <label className="text-xs block mb-1.5" style={{ color: COLORS.inkSoft }}>Additional notes</label>
                  <textarea
                    value={familyDraft}
                    onChange={(e) => setFamilyDraft(e.target.value)}
                    rows={4}
                    className="w-full rounded-xl px-3.5 py-3 text-sm outline-none resize-none"
                    style={{ background: COLORS.surfaceAlt, border: `1px solid ${COLORS.border}`, color: COLORS.ink }}
                    placeholder="Family history of heart disease, diabetes, cancer, or other relevant conditions..."
                  />
                </div>

                <button onClick={saveFamilyHistory} className="flex items-center gap-1.5 text-sm px-4 py-2.5 rounded-xl font-medium" style={{ background: COLORS.ink, color: "#fff" }}>
                  {familySaved ? <Check size={14} /> : <Plus size={14} />} {familySaved ? "Saved" : "Save"}
                </button>
              </>
            )}
          </Card>
        )}
      </div>

      <div
        className="fixed bottom-0 left-0 right-0 flex justify-around items-center py-2"
        style={{ background: COLORS.surface, borderTop: `1px solid ${COLORS.border}`, boxShadow: "0 -4px 16px rgba(22,35,31,0.06)" }}
      >
        {NAV_ITEMS.map(({ id, label, Icon }) => {
          const active = activeTab === id;
          return (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className="flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl"
            >
              <Icon size={20} color={active ? COLORS.primary : COLORS.inkSoft} strokeWidth={active ? 2.4 : 2} />
              <span className="text-[10px] font-semibold" style={{ color: active ? COLORS.primary : COLORS.inkSoft }}>{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
