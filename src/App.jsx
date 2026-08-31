import { useEffect, useState } from "react";
import { Heart, Share2, LogOut, Plus, Lock, Mail, Activity, Droplet, FileText, Check, User, Scale, Footprints, Dumbbell, Moon, HeartPulse, ArrowLeft, Home, FlaskConical, Stethoscope, Bell, Send, AlertTriangle, ChevronRight, Apple, CheckCircle2, Settings as SettingsIcon, CreditCard } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from "recharts";
import { supabase } from "./supabaseClient";

const COLORS = {
  ink: "#16231F",
  inkSoft: "#4B5C55",
  primary: "#FF4500",
  primarySoft: "#FF7A45",
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
  { id: "a1c", label: "HbA1c", unit: "%", min: 4, max: 9, breaks: [5.7, 6.5] },
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

const METRIC_DEFS = [
  {
    id: "steps", label: "Steps", Icon: Footprints, unit: " steps", dataKey: "value", decimals: 0, color: COLORS.primary,
    recommendedFields: [{ key: "recommended_steps", label: "Recommended steps/day", placeholder: "10000", parse: (v) => (v === "" ? null : parseInt(v, 10)) }],
  },
  {
    id: "sleep", label: "Sleep", Icon: Moon, unit: " hrs", dataKey: "hours", decimals: 1, color: COLORS.primary,
    recommendedFields: [{ key: "recommended_sleep_hours", label: "Recommended sleep (hrs)", placeholder: "8", parse: (v) => (v === "" ? null : parseFloat(v)) }],
  },
  {
    id: "workoutWeight", label: "Workout / Gym", Icon: Dumbbell, unit: " min", dataKey: "minutes", decimals: 0, color: COLORS.elevated,
    recommendedFields: [{ key: "recommended_workout_weight_minutes", label: "Recommended minutes/day", placeholder: "20", parse: (v) => (v === "" ? null : parseInt(v, 10)) }],
  },
  {
    id: "workoutCardio", label: "Cardio / Walk", Icon: Footprints, unit: " min", dataKey: "minutes", decimals: 0, color: COLORS.normal,
    recommendedFields: [{ key: "recommended_workout_cardio_minutes", label: "Recommended minutes/day", placeholder: "30", parse: (v) => (v === "" ? null : parseInt(v, 10)) }],
  },
  {
    id: "heartRateMin", label: "Heart Rate Min", Icon: HeartPulse, unit: " bpm", dataKey: "min_bpm", decimals: 0, color: COLORS.primary,
    recommendedFields: [{ key: "recommended_heart_rate_min", label: "Recommended min (bpm)", placeholder: "60", parse: (v) => (v === "" ? null : parseInt(v, 10)) }],
  },
  {
    id: "heartRateMax", label: "Heart Rate Max", Icon: HeartPulse, unit: " bpm", dataKey: "max_bpm", decimals: 0, color: COLORS.primary,
    recommendedFields: [{ key: "recommended_heart_rate_max", label: "Recommended max (bpm)", placeholder: "100", parse: (v) => (v === "" ? null : parseInt(v, 10)) }],
  },
  {
    id: "fastingSugar", label: "Fasting sugar", Icon: Droplet, unit: " mg/dL", dataKey: "value", decimals: 0, color: COLORS.normal,
    recommendedFields: [{ key: "recommended_sugar_fasting", label: "Recommended fasting sugar (mg/dL)", placeholder: "90", parse: (v) => (v === "" ? null : parseInt(v, 10)) }],
  },
  {
    id: "nonFastingSugar", label: "Non-fasting sugar", Icon: Droplet, unit: " mg/dL", dataKey: "value", decimals: 0, color: COLORS.elevated,
    recommendedFields: [{ key: "recommended_sugar_nonfasting", label: "Recommended non-fasting sugar (mg/dL)", placeholder: "120", parse: (v) => (v === "" ? null : parseInt(v, 10)) }],
  },
  {
    id: "a1c", label: "HbA1c", Icon: Droplet, unit: "%", dataKey: "value", decimals: 1, color: COLORS.primarySoft,
    recommendedFields: [{ key: "recommended_sugar_a1c", label: "Recommended HbA1c (%)", placeholder: "5.6", parse: (v) => (v === "" ? null : parseFloat(v)) }],
  },
  {
    id: "bloodPressure", label: "Blood pressure", Icon: Heart, unit: " mmHg", dataKey: null, decimals: 0, color: null,
    recommendedFields: [
      { key: "recommended_bp_systolic", label: "Recommended systolic (mmHg)", placeholder: "120", parse: (v) => (v === "" ? null : parseInt(v, 10)) },
      { key: "recommended_bp_diastolic", label: "Recommended diastolic (mmHg)", placeholder: "80", parse: (v) => (v === "" ? null : parseInt(v, 10)) },
    ],
  },
];

const ACTIVITY_METRIC_IDS = ["steps", "sleep", "workoutWeight", "workoutCardio", "heartRateMin", "heartRateMax"];

const LAB_DETAIL_SECTIONS = [
  {
    id: "cbc", label: "Complete Blood Count",
    metrics: [
      { key: "hb", label: "Hb" }, { key: "rbc", label: "RBC" }, { key: "hct", label: "HCT" },
      { key: "mcv", label: "MCV" }, { key: "mch", label: "MCH" }, { key: "mchc", label: "MCHC" },
      { key: "wbc", label: "WBC" }, { key: "platelets", label: "Platelets" },
    ],
  },
  {
    id: "glucose", label: "Glucose / Metabolic",
    metrics: [
      { key: "fasting_glucose", label: "Fasting glucose" }, { key: "pp_glucose", label: "PP glucose" },
      { key: "hba1c", label: "HbA1c" }, { key: "fasting_insulin", label: "Fasting insulin" },
      { key: "homa_ir", label: "HOMA-IR" }, { key: "fructosamine", label: "Fructosamine" },
    ],
  },
  {
    id: "lipids", label: "Lipids",
    metrics: [
      { key: "tc", label: "TC" }, { key: "ldl_c", label: "LDL-C" }, { key: "hdl_c", label: "HDL-C" },
      { key: "tg", label: "TG" }, { key: "non_hdl_c", label: "Non-HDL-C" }, { key: "apob", label: "ApoB" },
      { key: "apoa1", label: "ApoA1" }, { key: "lpa", label: "Lp(a)" },
    ],
  },
  {
    id: "liver", label: "Liver",
    metrics: [
      { key: "ast", label: "AST" }, { key: "alt", label: "ALT" }, { key: "ggt", label: "GGT" },
      { key: "alp", label: "ALP" }, { key: "bilirubin", label: "Bilirubin" }, { key: "albumin", label: "Albumin" },
      { key: "total_protein", label: "Total protein" },
    ],
  },
  {
    id: "kidney", label: "Kidney",
    metrics: [
      { key: "creatinine", label: "Creatinine" }, { key: "egfr", label: "eGFR" },
      { key: "urea", label: "Urea" }, { key: "cystatin_c", label: "Cystatin-C" },
    ],
  },
  {
    id: "thyroid", label: "Thyroid",
    metrics: [{ key: "tsh", label: "TSH" }],
  },
  {
    id: "nutritional", label: "Nutritional",
    metrics: [
      { key: "b12", label: "B12" }, { key: "ferritin", label: "Ferritin" }, { key: "iron", label: "Iron" },
      { key: "tibc", label: "TIBC" }, { key: "transferrin_saturation", label: "Transferrin saturation" },
      { key: "vitamin_d", label: "Vitamin D" }, { key: "calcium", label: "Calcium" },
    ],
  },
  {
    id: "inflammation", label: "Inflammation",
    metrics: [{ key: "hscrp", label: "hsCRP" }, { key: "esr", label: "ESR" }],
  },
  {
    id: "other", label: "Other",
    metrics: [
      { key: "homocysteine", label: "Homocysteine" }, { key: "uric_acid", label: "Uric acid" },
      { key: "testosterone", label: "Testosterone" },
    ],
  },
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

function HistoryBarChart({ data, dataKey, colorForEntry, unit = "", height = 160, showAxis = true, maxBarSize = 28, referenceValue = null, referenceLabel }) {
  if (!data || data.length === 0) return null;
  const chartData = data.map((d) => ({ ...d, _label: shortDate(d.created_at) }));
  const hasReference = typeof referenceValue === "number" && !Number.isNaN(referenceValue);
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
        {hasReference && (
          <ReferenceLine
            y={referenceValue}
            stroke={COLORS.ink}
            strokeDasharray="4 4"
            strokeWidth={1} strokeOpacity={0.45}
            ifOverflow="extendDomain"
            label={showAxis ? { value: referenceLabel || `Target: ${referenceValue}${unit}`, position: "insideTopRight", fontSize: 10, fill: COLORS.inkSoft } : undefined}
          />
        )}
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

function ActivitySection({ Icon, label, latest, prev, dataKey, unit, decimals, data, color, iconColor = COLORS.primary, textColor = COLORS.ink, recommendedValue, onOpen, bare = false }) {
  const content = (
    <>
      <div className="flex items-center gap-2 mb-4">
        <Icon size={16} color={iconColor} />
        <span className={bare ? "text-sm font-semibold" : "text-lg font-semibold"} style={{ color: textColor, fontFamily: "'Space Grotesk', sans-serif" }}>{label}</span>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col items-center justify-center">
          <span className="text-xs font-semibold mb-2" style={{ color: COLORS.inkSoft }}>MOST RECENT</span>
          {latest ? (
            <>
              <div style={{ fontFamily: "'Space Grotesk', sans-serif", color: textColor }} className="text-4xl font-bold">
                {latest[dataKey]}<span className="text-base" style={{ color: COLORS.inkSoft, fontWeight: 500 }}>{unit}</span>
              </div>
              {prev && (
                <span
                  className="text-xs font-semibold px-2.5 py-1 rounded-full mt-2"
                  style={{
                    background: (latest[dataKey] >= prev[dataKey] ? COLORS.elevated : COLORS.normal) + "1a",
                    color: latest[dataKey] >= prev[dataKey] ? COLORS.elevated : COLORS.normal,
                  }}
                >
                  {latest[dataKey] > prev[dataKey] ? "+" : ""}{(latest[dataKey] - prev[dataKey]).toFixed(decimals)}{unit} vs last
                </span>
              )}
              <span className="text-xs mt-2 text-center" style={{ color: COLORS.inkSoft }}>{formatDate(latest.created_at)} · {daysAgoLabel(latest.created_at)}</span>
            </>
          ) : (
            <span className="text-xs text-center" style={{ color: COLORS.inkSoft }}>No data yet</span>
          )}
        </div>
        <div className="rounded-xl">
          <span className="text-xs font-semibold block mb-1 text-center" style={{ color: COLORS.inkSoft }}>LAST 5 · TAP FOR MORE</span>
          {data.length > 0 ? (
            <HistoryBarChart
              data={data.slice(-5)}
              dataKey={dataKey}
              unit={unit}
              colorForEntry={(entry, i, arr) => (i === arr.length - 1 ? color : COLORS.muted)}
              height={110}
              showAxis={false}
              maxBarSize={20}
              referenceValue={recommendedValue}
            />
          ) : (
            <div className="flex items-center justify-center" style={{ height: 110 }}>
              <span className="text-xs" style={{ color: COLORS.inkSoft }}>No data</span>
            </div>
          )}
        </div>
      </div>
    </>
  );
  return (
    <div onClick={onOpen} className="cursor-pointer transition-transform active:scale-[0.99]">
      {bare ? content : <Card>{content}</Card>}
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
  const [authMode, setAuthMode] = useState("signin"); // 'signin' | 'signup' | 'forgotPassword'
  const [name, setName] = useState("");
  const [role, setRole] = useState("Patient");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordConfirm, setNewPasswordConfirm] = useState("");
  const [newPasswordError, setNewPasswordError] = useState("");
  const [newPasswordLoading, setNewPasswordLoading] = useState(false);

  const [patients, setPatients] = useState([]);
  const [selectedPatientId, setSelectedPatientId] = useState(null);
  const [doctors, setDoctors] = useState([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState(null);
  const [doctorSlots, setDoctorSlots] = useState([]);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [myAppointments, setMyAppointments] = useState([]);
  const [slotDate, setSlotDate] = useState("");
  const [slotTime, setSlotTime] = useState("");
  const [slotDuration, setSlotDuration] = useState("30");

  const [bpReadings, setBpReadings] = useState([]);
  const [sugarReadings, setSugarReadings] = useState([]);
  const [weightReadings, setWeightReadings] = useState([]);
  const [weightValue, setWeightValue] = useState("");
  const [weightTargetDraft, setWeightTargetDraft] = useState("");
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
  const [prescriptionDrafts, setPrescriptionDrafts] = useState({ medicine: "", supplement: "" });
  const [prescriptionSaved, setPrescriptionSaved] = useState(null);
  const [doctorSubTab, setDoctorSubTab] = useState("prescription"); // 'prescription' | 'messages'
  const [messages, setMessages] = useState([]);
  const [messageDraft, setMessageDraft] = useState("");
  const [doctorHasUnreadMessages, setDoctorHasUnreadMessages] = useState(false);
  const [metricDetailId, setMetricDetailId] = useState(null);
  const [recommendedDraft, setRecommendedDraft] = useState({});
  const [recommendedSaved, setRecommendedSaved] = useState(false);
  const [activitySubTab, setActivitySubTab] = useState("activity"); // 'activity' | 'sensors'
  const [labSubTab, setLabSubTab] = useState("readings"); // 'readings' | 'upload'
  const [labReports, setLabReports] = useState([]);
  const [labMetricReadings, setLabMetricReadings] = useState([]);
  const [labDetailDrafts, setLabDetailDrafts] = useState(
    Object.fromEntries(LAB_DETAIL_SECTIONS.flatMap((s) => s.metrics.map((m) => [m.key, ""])))
  );
  const [labDetailSaved, setLabDetailSaved] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [fileInputKey, setFileInputKey] = useState(0);

  const [sys, setSys] = useState("");
  const [dia, setDia] = useState("");
  const [pulse, setPulse] = useState("");
  const [fastingValue, setFastingValue] = useState("");
  const [nonFastingValue, setNonFastingValue] = useState("");
  const [a1cValue, setA1cValue] = useState("");

  // Track auth session
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      if (event === "PASSWORD_RECOVERY") setIsPasswordRecovery(true);
    });
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

  // Patients: load the doctor list, for booking appointments
  useEffect(() => {
    if (profile?.role === "Patient") {
      supabase.from("profiles").select("*").eq("role", "Doctor").then(({ data }) => {
        setDoctors(data || []);
        if (data && data.length > 0 && !selectedDoctorId) setSelectedDoctorId(data[0].id);
      });
    }
  }, [profile]);

  // Doctors: load their own appointment slots (open + booked), independent of which patient is selected
  useEffect(() => {
    if (profile?.role !== "Doctor") return;
    supabase.from("appointment_slots").select("*").eq("doctor_id", profile.id).order("slot_start", { ascending: true })
      .then(({ data }) => setDoctorSlots(data || []));
  }, [profile?.id, profile?.role]);

  // Patients: load the selected doctor's open slots to browse
  useEffect(() => {
    if (profile?.role !== "Patient" || !selectedDoctorId) return;
    supabase.from("appointment_slots").select("*").eq("doctor_id", selectedDoctorId).eq("status", "open")
      .order("slot_start", { ascending: true }).then(({ data }) => setAvailableSlots(data || []));
  }, [selectedDoctorId, profile?.role]);

  // Patients: load their own booked appointments, across any doctor
  useEffect(() => {
    if (profile?.role !== "Patient") return;
    supabase.from("appointment_slots").select("*").eq("patient_id", profile.id).order("slot_start", { ascending: true })
      .then(({ data }) => setMyAppointments(data || []));
  }, [profile?.id, profile?.role]);

  const activePatientId = profile?.role === "Doctor" ? selectedPatientId : profile?.id;
  const activePatientProfile = profile?.role === "Doctor" ? patients.find((p) => p.id === selectedPatientId) : profile;

  // Sync the recommended-value draft whenever the activity detail page or active patient changes
  useEffect(() => {
    if (!metricDetailId) return;
    const metric = METRIC_DEFS.find((m) => m.id === metricDetailId);
    if (!metric) return;
    const draft = {};
    metric.recommendedFields.forEach((f) => { draft[f.key] = activePatientProfile?.[f.key] ?? ""; });
    setRecommendedDraft(draft);
  }, [metricDetailId, activePatientId]);

  // Sync the weight target draft whenever the weight history page or active patient changes
  useEffect(() => {
    if (page !== "weightHistory") return;
    setWeightTargetDraft(activePatientProfile?.recommended_weight_kg ?? "");
  }, [page, activePatientId]);

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
        const rows = data || [];
        setPrescriptions(rows);
        setPrescriptionDrafts({
          medicine: rows.find((p) => (p.category || "medicine") === "medicine")?.text || "",
          supplement: rows.find((p) => p.category === "supplement")?.text || "",
        });
      });
    supabase.from("messages").select("*").eq("patient_id", activePatientId).order("created_at", { ascending: true })
      .then(({ data }) => setMessages(data || []));
    supabase.from("lab_reports").select("*").eq("patient_id", activePatientId).order("created_at", { ascending: false })
      .then(({ data }) => setLabReports(data || []));
    supabase.from("lab_metric_readings").select("*").eq("patient_id", activePatientId).order("created_at", { ascending: true })
      .then(({ data }) => setLabMetricReadings(data || []));
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

  const handleForgotPassword = async () => {
    setAuthError("");
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin });
    if (error) { setAuthError(error.message); setLoading(false); return; }
    setResetSent(true);
    setLoading(false);
  };

  const handleSetNewPassword = async () => {
    setNewPasswordError("");
    if (newPassword.length < 6) { setNewPasswordError("Password must be at least 6 characters."); return; }
    if (newPassword !== newPasswordConfirm) { setNewPasswordError("Passwords don't match."); return; }
    setNewPasswordLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) { setNewPasswordError(error.message); setNewPasswordLoading(false); return; }
    setIsPasswordRecovery(false);
    setNewPassword("");
    setNewPasswordConfirm("");
    setNewPasswordLoading(false);
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

  const saveWeightTarget = async () => {
    if (!activePatientId) return;
    const parsed = weightTargetDraft === "" ? null : parseFloat(weightTargetDraft);
    const { data } = await supabase.from("profiles").update({ recommended_weight_kg: parsed }).eq("id", activePatientId).select().single();
    if (data) setPatients((prev) => prev.map((p) => (p.id === data.id ? data : p)));
    setRecommendedSaved(true);
    setTimeout(() => setRecommendedSaved(false), 1800);
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

  const saveRecommended = async () => {
    const metric = METRIC_DEFS.find((m) => m.id === metricDetailId);
    if (!metric || !activePatientId) return;
    const payload = {};
    metric.recommendedFields.forEach((f) => { payload[f.key] = f.parse(recommendedDraft[f.key] ?? ""); });
    const { data } = await supabase.from("profiles").update(payload).eq("id", activePatientId).select().single();
    if (data) setPatients((prev) => prev.map((p) => (p.id === data.id ? data : p)));
    setRecommendedSaved(true);
    setTimeout(() => setRecommendedSaved(false), 1800);
  };

  const uploadLabReport = async () => {
    if (!selectedFile || !activePatientId) return;
    setUploadingFile(true);
    const path = `${activePatientId}/${Date.now()}_${selectedFile.name}`;
    const { error: uploadError } = await supabase.storage.from("lab-reports").upload(path, selectedFile);
    if (!uploadError) {
      const { data } = await supabase.from("lab_reports").insert({
        patient_id: activePatientId, uploaded_by: profile.id, file_name: selectedFile.name,
        file_path: path, content_type: selectedFile.type,
      }).select();
      if (data) setLabReports([data[0], ...labReports]);
    }
    setSelectedFile(null);
    setFileInputKey((k) => k + 1);
    setUploadingFile(false);
  };

  const viewLabReport = async (report) => {
    const { data } = await supabase.storage.from("lab-reports").createSignedUrl(report.file_path, 3600);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  };

  const saveLabDetailSection = async (sectionId) => {
    if (!activePatientId) return;
    const section = LAB_DETAIL_SECTIONS.find((s) => s.id === sectionId);
    const rows = section.metrics
      .filter((m) => labDetailDrafts[m.key]?.trim())
      .map((m) => ({ patient_id: activePatientId, metric_key: m.key, value: labDetailDrafts[m.key].trim() }));
    if (rows.length === 0) return;
    const { data, error } = await supabase.from("lab_metric_readings").insert(rows).select();
    if (error) {
      console.error("Failed to save lab metric reading:", error);
      alert(`Couldn't save: ${error.message}`);
      return;
    }
    setLabMetricReadings([...labMetricReadings, ...data]);
    setLabDetailDrafts({ ...labDetailDrafts, ...Object.fromEntries(section.metrics.map((m) => [m.key, ""])) });
    setLabDetailSaved(sectionId);
    setTimeout(() => setLabDetailSaved(null), 1800);
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

  const connectAppleHealth = async () => {
    const { data } = await supabase.from("profiles").update({
      apple_health_connected: true, apple_health_connected_at: new Date().toISOString(),
    }).eq("id", profile.id).select().single();
    if (data) setProfile(data);
  };

  const disconnectAppleHealth = async () => {
    const { data } = await supabase.from("profiles").update({
      apple_health_connected: false, apple_health_connected_at: null,
    }).eq("id", profile.id).select().single();
    if (data) setProfile(data);
  };

  const savePrescription = async (category) => {
    if (!activePatientId || !prescriptionDrafts[category]?.trim()) return;
    const { data } = await supabase.from("prescriptions").insert({
      patient_id: activePatientId, doctor_id: profile.id, text: prescriptionDrafts[category], category,
    }).select();
    if (data) setPrescriptions([data[0], ...prescriptions]);
    setPrescriptionSaved(category);
    setTimeout(() => setPrescriptionSaved(null), 1800);
  };

  const addSlot = async () => {
    if (!slotDate || !slotTime) return;
    const start = new Date(`${slotDate}T${slotTime}`);
    if (Number.isNaN(start.getTime()) || start.getTime() <= Date.now()) return;
    const end = new Date(start.getTime() + parseInt(slotDuration, 10) * 60000);
    const { data } = await supabase.from("appointment_slots").insert({
      doctor_id: profile.id, slot_start: start.toISOString(), slot_end: end.toISOString(), status: "open",
    }).select();
    if (data) {
      setDoctorSlots([...doctorSlots, ...data].sort((a, b) => new Date(a.slot_start) - new Date(b.slot_start)));
    }
    setSlotDate("");
    setSlotTime("");
  };

  const removeSlot = async (slotId) => {
    await supabase.from("appointment_slots").delete().eq("id", slotId);
    setDoctorSlots((prev) => prev.filter((s) => s.id !== slotId));
  };

  const bookSlot = async (slot) => {
    const { data } = await supabase.from("appointment_slots")
      .update({ patient_id: profile.id, status: "booked", booked_at: new Date().toISOString() })
      .eq("id", slot.id).eq("status", "open").select();
    setAvailableSlots((prev) => prev.filter((s) => s.id !== slot.id));
    if (data && data.length > 0) {
      setMyAppointments((prev) => [...prev, data[0]].sort((a, b) => new Date(a.slot_start) - new Date(b.slot_start)));
    }
  };

  const cancelAppointment = async (slot) => {
    const { data } = await supabase.from("appointment_slots")
      .update({ patient_id: null, status: "open", booked_at: null })
      .eq("id", slot.id).select();
    if (!data || data.length === 0) return;
    const updated = data[0];
    setDoctorSlots((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
    setMyAppointments((prev) => prev.filter((s) => s.id !== updated.id));
    if (updated.doctor_id === selectedDoctorId) {
      setAvailableSlots((prev) => [...prev, updated].sort((a, b) => new Date(a.slot_start) - new Date(b.slot_start)));
    }
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
  const medicinePrescriptions = prescriptions.filter((p) => (p.category || "medicine") === "medicine");
  const supplementPrescriptions = prescriptions.filter((p) => p.category === "supplement");
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
  const prevSteps = stepsReadings[stepsReadings.length - 2];
  const workoutWeightEntries = workoutReadings.filter((r) => r.type === "weight");
  const workoutCardioEntries = workoutReadings.filter((r) => r.type === "cardio");
  const latestWorkoutWeight = workoutWeightEntries[workoutWeightEntries.length - 1];
  const prevWorkoutWeight = workoutWeightEntries[workoutWeightEntries.length - 2];
  const latestWorkoutCardio = workoutCardioEntries[workoutCardioEntries.length - 1];
  const prevWorkoutCardio = workoutCardioEntries[workoutCardioEntries.length - 2];
  const latestSleep = sleepReadings[sleepReadings.length - 1];
  const prevSleep = sleepReadings[sleepReadings.length - 2];
  const latestHeartRate = heartRateReadings[heartRateReadings.length - 1];
  const prevHeartRate = heartRateReadings[heartRateReadings.length - 2];
  const fastingEntries = sugarReadings.filter((r) => r.type === "fasting");
  const nonFastingEntries = sugarReadings.filter((r) => r.type === "nonfasting");
  const a1cEntries = sugarReadings.filter((r) => r.type === "a1c");
  const latestFasting = fastingEntries[fastingEntries.length - 1];
  const prevFasting = fastingEntries[fastingEntries.length - 2];
  const latestNonFasting = nonFastingEntries[nonFastingEntries.length - 1];
  const prevNonFasting = nonFastingEntries[nonFastingEntries.length - 2];
  const latestA1c = a1cEntries[a1cEntries.length - 1];
  const prevA1c = a1cEntries[a1cEntries.length - 2];
  const prevBp = bpReadings[bpReadings.length - 2];
  const latestSugarReading = [latestFasting, latestNonFasting, latestA1c]
    .filter(Boolean)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];
  const latestSugarZone = latestSugarReading ? categorizeSugar(latestSugarReading.type, latestSugarReading.value) : null;
  const latestSugarUnit = latestSugarReading ? SUGAR_TYPES.find((s) => s.id === latestSugarReading.type).unit : "";
  const heartRateZoneColor = latestHeartRate
    ? (latestHeartRate.min_bpm < 60 || latestHeartRate.max_bpm > 100 ? COLORS.elevated : COLORS.normal)
    : COLORS.muted;

  const METRIC_RUNTIME = {
    steps: { data: stepsReadings, latest: latestSteps, prev: prevSteps },
    sleep: { data: sleepReadings, latest: latestSleep, prev: prevSleep },
    workoutWeight: { data: workoutWeightEntries, latest: latestWorkoutWeight, prev: prevWorkoutWeight },
    workoutCardio: { data: workoutCardioEntries, latest: latestWorkoutCardio, prev: prevWorkoutCardio },
    heartRateMin: { data: heartRateReadings, latest: latestHeartRate, prev: prevHeartRate },
    heartRateMax: { data: heartRateReadings, latest: latestHeartRate, prev: prevHeartRate },
    fastingSugar: { data: fastingEntries, latest: latestFasting, prev: prevFasting },
    nonFastingSugar: { data: nonFastingEntries, latest: latestNonFasting, prev: prevNonFasting },
    a1c: { data: a1cEntries, latest: latestA1c, prev: prevA1c },
  };

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

  // ---------- PASSWORD RECOVERY SCREEN ----------
  if (isPasswordRecovery) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center p-6" style={{ background: COLORS.bg }}>
        <div className="w-full max-w-sm rounded-3xl p-9" style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, boxShadow: "0 30px 60px -20px rgba(22,35,31,0.20)" }}>
          <div className="flex flex-col items-center mb-8">
            <div className="w-14 h-14 rounded-full flex items-center justify-center mb-4" style={{ background: `linear-gradient(155deg, ${COLORS.primarySoft}, ${COLORS.primary})` }}>
              <Lock size={24} color="#fff" />
            </div>
            <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, color: COLORS.ink }} className="text-2xl text-center">Set a new password</h1>
            <p className="text-sm mt-2 text-center" style={{ color: COLORS.inkSoft }}>Choose a new password for your account.</p>
          </div>

          <label className="text-xs font-medium block mb-1.5" style={{ color: COLORS.inkSoft }}>NEW PASSWORD</label>
          <div className="flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 mb-4" style={{ background: COLORS.surfaceAlt, border: `1px solid ${COLORS.border}` }}>
            <Lock size={16} color={COLORS.inkSoft} />
            <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="At least 6 characters" className="bg-transparent outline-none text-sm w-full" style={{ color: COLORS.ink }} />
          </div>

          <label className="text-xs font-medium block mb-1.5" style={{ color: COLORS.inkSoft }}>CONFIRM NEW PASSWORD</label>
          <div className="flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 mb-2" style={{ background: COLORS.surfaceAlt, border: `1px solid ${COLORS.border}` }}>
            <Lock size={16} color={COLORS.inkSoft} />
            <input type="password" value={newPasswordConfirm} onChange={(e) => setNewPasswordConfirm(e.target.value)} placeholder="Re-enter password" className="bg-transparent outline-none text-sm w-full" style={{ color: COLORS.ink }} />
          </div>

          {newPasswordError && <p className="text-xs mb-3" style={{ color: COLORS.high }}>{newPasswordError}</p>}

          <button onClick={handleSetNewPassword} disabled={newPasswordLoading} className="w-full py-3 mt-4 rounded-xl text-sm font-semibold" style={{ background: `linear-gradient(155deg, ${COLORS.primarySoft}, ${COLORS.primary})`, color: "#fff" }}>
            {newPasswordLoading ? "Saving..." : "Save new password"}
          </button>
        </div>
      </div>
    );
  }

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

          {authMode === "forgotPassword" ? (
            <>
              <button
                onClick={() => { setAuthMode("signin"); setResetSent(false); setAuthError(""); }}
                className="flex items-center gap-1.5 text-xs font-medium mb-5"
                style={{ color: COLORS.inkSoft }}
              >
                <ArrowLeft size={14} /> Back to sign in
              </button>

              {resetSent ? (
                <p className="text-sm text-center" style={{ color: COLORS.ink }}>
                  Check <strong>{email}</strong> for a link to reset your password.
                </p>
              ) : (
                <>
                  <p className="text-sm mb-4" style={{ color: COLORS.inkSoft }}>Enter your email and we'll send you a link to reset your password.</p>
                  <label className="text-xs font-medium block mb-1.5" style={{ color: COLORS.inkSoft }}>EMAIL</label>
                  <div className="flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 mb-4" style={{ background: COLORS.surfaceAlt, border: `1px solid ${COLORS.border}` }}>
                    <Mail size={16} color={COLORS.inkSoft} />
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="bg-transparent outline-none text-sm w-full" style={{ color: COLORS.ink }} />
                  </div>

                  {authError && <p className="text-xs mb-3" style={{ color: COLORS.high }}>{authError}</p>}

                  <button onClick={handleForgotPassword} disabled={loading} className="w-full py-3 mt-1 rounded-xl text-sm font-semibold" style={{ background: `linear-gradient(155deg, ${COLORS.primarySoft}, ${COLORS.primary})`, color: "#fff" }}>
                    {loading ? "Sending..." : "Send reset link"}
                  </button>
                </>
              )}
            </>
          ) : (
            <>
              <div className="flex rounded-xl overflow-hidden mb-5" style={{ border: `1px solid ${COLORS.border}` }}>
                <button onClick={() => setAuthMode("signin")} className="flex-1 py-2 text-xs font-semibold" style={authMode === "signin" ? { background: COLORS.primary, color: "#fff" } : { background: COLORS.surfaceAlt, color: COLORS.inkSoft }}>Sign in</button>
                <button onClick={() => setAuthMode("signup")} className="flex-1 py-2 text-xs font-semibold" style={authMode === "signup" ? { background: COLORS.primary, color: "#fff" } : { background: COLORS.surfaceAlt, color: COLORS.inkSoft }}>Sign up</button>
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

              {authMode === "signin" && (
                <button
                  onClick={() => { setAuthMode("forgotPassword"); setAuthError(""); }}
                  className="text-xs font-medium block mb-3"
                  style={{ color: COLORS.primarySoft }}
                >
                  Forgot password?
                </button>
              )}

              {authError && <p className="text-xs mb-3" style={{ color: COLORS.high }}>{authError}</p>}

              <button onClick={handleAuth} disabled={loading} className="w-full py-3 mt-2 rounded-xl text-sm font-semibold" style={{ background: `linear-gradient(155deg, ${COLORS.primarySoft}, ${COLORS.primary})`, color: "#fff" }}>
                {loading ? "Please wait..." : authMode === "signup" ? "Create account" : "Sign in"}
              </button>
            </>
          )}
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
                referenceValue={activePatientProfile?.recommended_weight_kg ?? 70}
                referenceLabel={activePatientProfile?.recommended_weight_kg != null ? `Target: ${activePatientProfile.recommended_weight_kg} kg` : "Suggested: 70 kg"}
              />
            ) : (
              <p className="text-sm" style={{ color: COLORS.inkSoft }}>No weight readings yet.</p>
            )}

            {profile.role === "Patient" && (
              <div className="mt-5 pt-5" style={{ borderTop: `1px solid ${COLORS.border}` }}>
                <label className="text-xs block mb-1.5" style={{ color: COLORS.inkSoft }}>Log body weight (kg)</label>
                <div className="flex items-center gap-2">
                  <input type="number" step="0.1" value={weightValue} onChange={(e) => setWeightValue(e.target.value)} placeholder="75" className="w-full rounded-xl px-3 py-2.5 text-sm outline-none text-center" style={{ background: COLORS.surfaceAlt, border: `1px solid ${COLORS.border}`, color: COLORS.ink }} />
                  <button onClick={addWeightReading} className="flex items-center gap-1.5 text-sm px-4 py-2.5 rounded-xl font-medium flex-shrink-0" style={{ background: COLORS.primary, color: "#fff" }}>
                    <Plus size={14} /> Save
                  </button>
                </div>
              </div>
            )}

            <div className="mt-5 pt-5" style={{ borderTop: `1px solid ${COLORS.border}` }}>
              <span className="text-xs font-semibold tracking-wide block mb-3" style={{ color: COLORS.inkSoft }}>RECOMMENDED TARGET</span>
              {profile.role === "Doctor" ? (
                <>
                  <div className="mb-3">
                    <label className="text-xs block mb-1.5" style={{ color: COLORS.inkSoft }}>Recommended weight (kg)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={weightTargetDraft}
                      onChange={(e) => setWeightTargetDraft(e.target.value)}
                      placeholder="70"
                      className="w-full rounded-xl px-3 py-2.5 text-sm outline-none text-center"
                      style={{ background: COLORS.surfaceAlt, border: `1px solid ${COLORS.border}`, color: COLORS.ink }}
                    />
                  </div>
                  <button onClick={saveWeightTarget} className="flex items-center gap-1.5 text-sm px-4 py-2.5 rounded-xl font-medium" style={{ background: COLORS.primary, color: "#fff" }}>
                    {recommendedSaved ? <Check size={14} /> : <Plus size={14} />} {recommendedSaved ? "Saved" : "Save target"}
                  </button>
                </>
              ) : (
                <span className="text-sm" style={{ color: COLORS.ink }}>
                  Recommended weight: {activePatientProfile?.recommended_weight_kg != null
                    ? `${activePatientProfile.recommended_weight_kg} kg`
                    : <span style={{ color: COLORS.inkSoft }}>70 kg (general suggestion — your doctor hasn't set one)</span>}
                </span>
              )}
            </div>
          </Card>
        </div>
      </div>
    );
  }

  // ---------- ACTIVITY METRIC DETAIL PAGE ----------
  if (page === "metricDetail" && metricDetailId) {
    const metric = METRIC_DEFS.find((m) => m.id === metricDetailId);
    const runtime = METRIC_RUNTIME[metricDetailId];
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
              <metric.Icon size={16} color={COLORS.primary} />
              <span className="text-lg font-semibold" style={{ color: ACTIVITY_METRIC_IDS.includes(metricDetailId) ? COLORS.primary : COLORS.ink, fontFamily: "'Space Grotesk', sans-serif" }}>{metric.label} history</span>
            </div>

            {metricDetailId === "bloodPressure" ? (
              bpReadings.length > 0 ? (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={bpReadings.map((r) => ({ ...r, _label: shortDate(r.created_at) }))} margin={{ top: 8, right: 4, left: 4, bottom: 0 }}>
                    <XAxis dataKey="_label" tick={{ fontSize: 10, fill: COLORS.inkSoft }} axisLine={false} tickLine={false} />
                    <YAxis hide />
                    <Tooltip
                      cursor={{ fill: COLORS.surfaceAlt }}
                      contentStyle={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 10, fontSize: 12 }}
                      labelStyle={{ color: COLORS.ink, fontWeight: 600 }}
                    />
                    <Bar dataKey="systolic" name="Systolic" fill={COLORS.high} radius={[6, 6, 0, 0]} maxBarSize={18} />
                    <Bar dataKey="diastolic" name="Diastolic" fill={COLORS.normal} radius={[6, 6, 0, 0]} maxBarSize={18} />
                    <ReferenceLine
                      y={activePatientProfile?.recommended_bp_systolic ?? 120}
                      stroke={COLORS.high} strokeDasharray="4 4" strokeWidth={1} strokeOpacity={0.45}
                      label={{ value: activePatientProfile?.recommended_bp_systolic != null ? `Target systolic: ${activePatientProfile.recommended_bp_systolic}` : "Suggested systolic: 120", position: "insideTopRight", fontSize: 10, fill: COLORS.inkSoft }}
                    />
                    <ReferenceLine
                      y={activePatientProfile?.recommended_bp_diastolic ?? 80}
                      stroke={COLORS.normal} strokeDasharray="4 4" strokeWidth={1} strokeOpacity={0.45}
                      label={{ value: activePatientProfile?.recommended_bp_diastolic != null ? `Target diastolic: ${activePatientProfile.recommended_bp_diastolic}` : "Suggested diastolic: 80", position: "insideBottomRight", fontSize: 10, fill: COLORS.inkSoft }}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm" style={{ color: COLORS.inkSoft }}>No blood pressure readings yet.</p>
              )
            ) : runtime.data.length > 0 ? (
              <HistoryBarChart
                data={runtime.data}
                dataKey={metric.dataKey}
                unit={metric.unit}
                colorForEntry={() => metric.color}
                height={260}
                referenceValue={activePatientProfile?.[metric.recommendedFields[0].key] ?? Number(metric.recommendedFields[0].placeholder)}
                referenceLabel={
                  activePatientProfile?.[metric.recommendedFields[0].key] != null
                    ? `Target: ${activePatientProfile[metric.recommendedFields[0].key]}${metric.unit}`
                    : `Suggested: ${metric.recommendedFields[0].placeholder}${metric.unit}`
                }
              />
            ) : (
              <p className="text-sm" style={{ color: COLORS.inkSoft }}>No {metric.label.toLowerCase()} readings yet.</p>
            )}

            <div className="mt-5 pt-5" style={{ borderTop: `1px solid ${COLORS.border}` }}>
              <span className="text-xs font-semibold tracking-wide block mb-3" style={{ color: COLORS.inkSoft }}>RECOMMENDED TARGET</span>
              {profile.role === "Doctor" ? (
                <>
                  <div className={metric.recommendedFields.length > 1 ? "grid grid-cols-2 gap-3 mb-3" : "mb-3"}>
                    {metric.recommendedFields.map((f) => (
                      <div key={f.key}>
                        <label className="text-xs block mb-1.5" style={{ color: COLORS.inkSoft }}>{f.label}</label>
                        <input
                          type="number"
                          step="any"
                          value={recommendedDraft[f.key] ?? ""}
                          onChange={(e) => setRecommendedDraft({ ...recommendedDraft, [f.key]: e.target.value })}
                          placeholder={f.placeholder}
                          className="w-full rounded-xl px-3 py-2.5 text-sm outline-none text-center"
                          style={{ background: COLORS.surfaceAlt, border: `1px solid ${COLORS.border}`, color: COLORS.ink }}
                        />
                      </div>
                    ))}
                  </div>
                  <button onClick={saveRecommended} className="flex items-center gap-1.5 text-sm px-4 py-2.5 rounded-xl font-medium" style={{ background: COLORS.primary, color: "#fff" }}>
                    {recommendedSaved ? <Check size={14} /> : <Plus size={14} />} {recommendedSaved ? "Saved" : "Save target"}
                  </button>
                </>
              ) : (
                <div className="flex flex-col gap-1.5">
                  {metric.recommendedFields.map((f) => (
                    <span key={f.key} className="text-sm" style={{ color: COLORS.ink }}>
                      {f.label}: {activePatientProfile?.[f.key] != null
                        ? activePatientProfile[f.key]
                        : <span style={{ color: COLORS.inkSoft }}>{f.placeholder} (general suggestion — your doctor hasn't set one)</span>}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    );
  }

  // ---------- SETTINGS PAGE ----------
  if (page === "settings") {
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
              <SettingsIcon size={16} color={COLORS.primary} />
              <span className="text-lg font-semibold" style={{ color: COLORS.ink, fontFamily: "'Space Grotesk', sans-serif" }}>Settings</span>
            </div>

            <div className="mb-5">
              <div className="flex items-center gap-2 mb-3">
                <CreditCard size={16} color={COLORS.primary} />
                <span className="text-sm font-semibold" style={{ color: COLORS.ink }}>Membership</span>
              </div>
              <div className="rounded-xl p-3.5" style={{ background: COLORS.surfaceAlt }}>
                <span className="text-sm font-semibold block" style={{ color: COLORS.ink }}>Free plan</span>
                <span className="text-xs block mt-1" style={{ color: COLORS.inkSoft }}>
                  All features are available at no cost while Cuff is in testing. There's no paid plan or billing set up yet.
                </span>
              </div>
            </div>

            <button onClick={handleLogout} className="flex items-center gap-1.5 text-sm px-4 py-2.5 rounded-xl font-medium" style={{ background: COLORS.surface, color: COLORS.inkSoft, border: `1px solid ${COLORS.border}` }}>
              <LogOut size={14} /> Log out
            </button>
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
            <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, color: COLORS.primary }} className="text-xl">Cuff</span>
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
              <div className="flex items-center gap-2 mb-4">
                <Activity size={16} color={COLORS.primary} />
                <span className="text-lg font-semibold" style={{ color: COLORS.primary, fontFamily: "'Space Grotesk', sans-serif" }}>At-a-glance</span>
              </div>
              <div className="grid grid-cols-3 gap-2 mb-2">
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
              </div>
              <div className="grid grid-cols-3 gap-2">
                <AtAGlanceTile
                  Icon={HeartPulse}
                  label="Heart rate"
                  value={latestHeartRate ? `${latestHeartRate.min_bpm}–${latestHeartRate.max_bpm}` : "—"}
                  dotColor={heartRateZoneColor}
                  onClick={() => setActiveTab("activity")}
                />
                <AtAGlanceTile
                  Icon={Footprints}
                  label="Steps"
                  value={latestSteps ? `${latestSteps.value}` : "—"}
                  dotColor={latestSteps ? COLORS.normal : COLORS.muted}
                  onClick={() => setActiveTab("activity")}
                />
                <AtAGlanceTile
                  Icon={Dumbbell}
                  label="Workout mins"
                  value={latestWorkoutWeight ? `${latestWorkoutWeight.minutes}` : "—"}
                  dotColor={latestWorkoutWeight ? COLORS.normal : COLORS.muted}
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
                <div className="flex items-center gap-2 mb-4">
                  <Plus size={16} color={COLORS.primary} />
                  <span className="text-lg font-semibold" style={{ color: COLORS.primary, fontFamily: "'Space Grotesk', sans-serif" }}>Quick log</span>
                </div>
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
                  <span className="text-lg font-semibold" style={{ color: COLORS.primary, fontFamily: "'Space Grotesk', sans-serif" }}>Body weight</span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col items-center justify-center">
                    <span className="text-xs font-semibold mb-2" style={{ color: COLORS.inkSoft }}>MOST RECENT</span>
                    <div style={{ fontFamily: "'Space Grotesk', sans-serif", color: COLORS.primary }} className="text-4xl font-bold">
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
                      referenceValue={activePatientProfile?.recommended_weight_kg ?? 70}
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
            <div
              className="flex gap-2 mb-5 sticky top-0 z-10 py-2"
              style={{ background: COLORS.bg, borderBottom: `1px solid ${COLORS.border}` }}
            >
              {[
                { id: "activity", label: "Daily Activity" },
                { id: "sensors", label: "Connect Sensor" },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setActivitySubTab(t.id)}
                  className="text-xs font-medium px-3 py-1.5 rounded-full transition-colors"
                  style={
                    activitySubTab === t.id
                      ? { background: COLORS.primary, color: "#fff" }
                      : { background: COLORS.surface, color: COLORS.inkSoft, border: `1px solid ${COLORS.border}` }
                  }
                >
                  {t.label}
                </button>
              ))}
            </div>

            {activitySubTab === "sensors" && (
              <Card>
                <div className="rounded-2xl p-4 mb-4 flex items-start gap-3" style={{ background: COLORS.elevated + "14", border: `1px solid ${COLORS.elevated}` }}>
                  <AlertTriangle size={18} color={COLORS.elevated} className="flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="text-sm font-semibold block" style={{ color: COLORS.elevated }}>Coming soon</span>
                    <span className="text-xs block mt-0.5" style={{ color: COLORS.inkSoft }}>Sensor syncing isn't built yet — connecting below won't pull in any data.</span>
                  </div>
                </div>

                <div className="rounded-2xl p-4 mb-4 flex items-center gap-3.5" style={{ background: COLORS.surfaceAlt }}>
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}` }}>
                    <Apple size={20} color={COLORS.ink} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-sm font-semibold block" style={{ color: COLORS.ink }}>Apple Health</span>
                    {profile.apple_health_connected ? (
                      <span className="text-xs flex items-center gap-1 mt-0.5" style={{ color: COLORS.normal }}>
                        <CheckCircle2 size={12} /> Connected {profile.apple_health_connected_at ? `· ${daysAgoLabel(profile.apple_health_connected_at)}` : ""}
                      </span>
                    ) : (
                      <span className="text-xs block mt-0.5" style={{ color: COLORS.inkSoft }}>Not connected</span>
                    )}
                  </div>
                  {profile.apple_health_connected ? (
                    <button onClick={disconnectAppleHealth} className="text-xs font-medium px-3.5 py-2 rounded-xl flex-shrink-0" style={{ background: COLORS.surface, color: COLORS.inkSoft, border: `1px solid ${COLORS.border}` }}>
                      Disconnect
                    </button>
                  ) : (
                    <button onClick={connectAppleHealth} className="text-xs font-medium px-3.5 py-2 rounded-xl flex-shrink-0" style={{ background: COLORS.primary, color: "#fff" }}>
                      Connect
                    </button>
                  )}
                </div>

                <p className="text-xs leading-relaxed" style={{ color: COLORS.inkSoft }}>
                  Apple Health data lives on your iPhone and Apple only allows native iOS apps to read it directly —
                  a website like this one can't connect to HealthKit on its own. "Connect" here marks your account as
                  linked; to actually pull in steps, heart rate, sleep, and weight from Apple Health, Cuff needs a
                  companion iOS app (or a sync service like Terra, Vital, or Spike) to bridge HealthKit data into your
                  readings. Until that's built, connecting here won't sync data automatically — you can still log
                  everything yourself from the Activity and Lab tabs.
                </p>
              </Card>
            )}

            {activitySubTab === "activity" && (
              <>
            <ActivitySection
              Icon={Footprints} label="Steps" dataKey="value" unit=" steps" decimals={0}
              latest={latestSteps} prev={prevSteps} data={stepsReadings} color={COLORS.primary} iconColor={COLORS.primary} textColor={COLORS.primary}
              recommendedValue={activePatientProfile?.recommended_steps ?? 10000}
              onOpen={() => { setMetricDetailId("steps"); setPage("metricDetail"); }}
            />
            <ActivitySection
              Icon={Moon} label="Sleep" dataKey="hours" unit=" hrs" decimals={1}
              latest={latestSleep} prev={prevSleep} data={sleepReadings} color={COLORS.primary} iconColor={COLORS.primary} textColor={COLORS.primary}
              recommendedValue={activePatientProfile?.recommended_sleep_hours ?? 8}
              onOpen={() => { setMetricDetailId("sleep"); setPage("metricDetail"); }}
            />
            <ActivitySection
              Icon={Dumbbell} label="Workout / Gym" dataKey="minutes" unit=" min" decimals={0}
              latest={latestWorkoutWeight} prev={prevWorkoutWeight} data={workoutWeightEntries} color={COLORS.primary} iconColor={COLORS.primary} textColor={COLORS.primary}
              recommendedValue={activePatientProfile?.recommended_workout_weight_minutes ?? 20}
              onOpen={() => { setMetricDetailId("workoutWeight"); setPage("metricDetail"); }}
            />
            <ActivitySection
              Icon={Footprints} label="Cardio / Walk" dataKey="minutes" unit=" min" decimals={0}
              latest={latestWorkoutCardio} prev={prevWorkoutCardio} data={workoutCardioEntries} color={COLORS.primary} iconColor={COLORS.primary} textColor={COLORS.primary}
              recommendedValue={activePatientProfile?.recommended_workout_cardio_minutes ?? 30}
              onOpen={() => { setMetricDetailId("workoutCardio"); setPage("metricDetail"); }}
            />

            <ActivitySection
              Icon={HeartPulse} label="Heart Rate Min" dataKey="min_bpm" unit=" bpm" decimals={0}
              latest={latestHeartRate} prev={prevHeartRate} data={heartRateReadings} color={COLORS.primary} iconColor={COLORS.primary} textColor={COLORS.primary}
              recommendedValue={activePatientProfile?.recommended_heart_rate_min ?? 60}
              onOpen={() => { setMetricDetailId("heartRateMin"); setPage("metricDetail"); }}
            />
            <ActivitySection
              Icon={HeartPulse} label="Heart Rate Max" dataKey="max_bpm" unit=" bpm" decimals={0}
              latest={latestHeartRate} prev={prevHeartRate} data={heartRateReadings} color={COLORS.primary} iconColor={COLORS.primary} textColor={COLORS.primary}
              recommendedValue={activePatientProfile?.recommended_heart_rate_max ?? 100}
              onOpen={() => { setMetricDetailId("heartRateMax"); setPage("metricDetail"); }}
            />

            {profile.role === "Patient" && (
              <Card>
                <div className="flex items-center gap-2 mb-4">
                  <Footprints size={16} color={COLORS.primary} />
                  <span className="text-sm font-semibold" style={{ color: COLORS.primary }}>Log activity</span>
                </div>

                <div className="mb-4">
                  <label className="text-xs block mb-1.5" style={{ color: COLORS.inkSoft }}>Steps</label>
                  <input type="number" value={stepsValue} onChange={(e) => setStepsValue(e.target.value)} placeholder="8000" className="w-full rounded-xl px-3 py-2.5 text-sm outline-none" style={{ background: COLORS.surfaceAlt, border: `1px solid ${COLORS.border}`, color: COLORS.ink }} />
                </div>

                <div className="mb-4">
                  <label className="text-xs block mb-1.5" style={{ color: COLORS.inkSoft }}>Sleep (hrs)</label>
                  <input type="number" step="0.1" value={sleepValue} onChange={(e) => setSleepValue(e.target.value)} placeholder="7.5" className="w-full rounded-xl px-3 py-2.5 text-sm outline-none" style={{ background: COLORS.surfaceAlt, border: `1px solid ${COLORS.border}`, color: COLORS.ink }} />
                </div>

                <div className="mb-4">
                  <label className="text-xs block mb-1.5" style={{ color: COLORS.inkSoft }}>Workout (mins)</label>
                  <input type="number" value={workoutWeightValue} onChange={(e) => setWorkoutWeightValue(e.target.value)} placeholder="30" className="w-full rounded-xl px-3 py-2.5 text-sm outline-none" style={{ background: COLORS.surfaceAlt, border: `1px solid ${COLORS.border}`, color: COLORS.ink }} />
                </div>

                <div className="mb-4">
                  <label className="text-xs block mb-1.5" style={{ color: COLORS.inkSoft }}>Cardio / Walk (mins)</label>
                  <input type="number" value={workoutCardioValue} onChange={(e) => setWorkoutCardioValue(e.target.value)} placeholder="20" className="w-full rounded-xl px-3 py-2.5 text-sm outline-none" style={{ background: COLORS.surfaceAlt, border: `1px solid ${COLORS.border}`, color: COLORS.ink }} />
                </div>

                <div className="mb-4">
                  <label className="text-xs block mb-1.5" style={{ color: COLORS.inkSoft }}>Heart Rate Min (bpm)</label>
                  <input type="number" value={hrMinValue} onChange={(e) => setHrMinValue(e.target.value)} placeholder="58" className="w-full rounded-xl px-3 py-2.5 text-sm outline-none" style={{ background: COLORS.surfaceAlt, border: `1px solid ${COLORS.border}`, color: COLORS.ink }} />
                </div>

                <div className="mb-4">
                  <label className="text-xs block mb-1.5" style={{ color: COLORS.inkSoft }}>Heart Rate Max (bpm)</label>
                  <input type="number" value={hrMaxValue} onChange={(e) => setHrMaxValue(e.target.value)} placeholder="142" className="w-full rounded-xl px-3 py-2.5 text-sm outline-none" style={{ background: COLORS.surfaceAlt, border: `1px solid ${COLORS.border}`, color: COLORS.ink }} />
                </div>

                <button
                  onClick={() => { addStepsReading(); addWorkoutReadings(); addSleepReading(); addHeartRateReading(); }}
                  className="flex items-center gap-1.5 text-sm px-4 py-2.5 rounded-xl font-medium"
                  style={{ background: COLORS.primary, color: "#fff" }}
                >
                  <Plus size={14} /> Save activity
                </button>
              </Card>
            )}
              </>
            )}
          </>
        )}

        {activeTab === "lab" && (
          <>
            <div
              className="flex gap-2 mb-5 sticky top-0 z-10 py-2"
              style={{ background: COLORS.bg, borderBottom: `1px solid ${COLORS.border}` }}
            >
              {[
                { id: "readings", label: "Readings" },
                { id: "details", label: "Details" },
                { id: "upload", label: "Upload" },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setLabSubTab(t.id)}
                  className="text-xs font-medium px-3 py-1.5 rounded-full transition-colors"
                  style={
                    labSubTab === t.id
                      ? { background: COLORS.primary, color: "#fff" }
                      : { background: COLORS.surface, color: COLORS.inkSoft, border: `1px solid ${COLORS.border}` }
                  }
                >
                  {t.label}
                </button>
              ))}
            </div>

            {labSubTab === "readings" && (
              <>
                <Card>
                  <div className="flex items-center gap-2 mb-4">
                    <Heart size={16} color={COLORS.primary} />
                    <span className="text-lg font-semibold" style={{ color: COLORS.primary, fontFamily: "'Space Grotesk', sans-serif" }}>Blood pressure</span>
                  </div>

                  <div>
                    <span className="text-sm font-semibold block mb-3" style={{ color: COLORS.primary }}>Systolic (top number)</span>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex flex-col items-center justify-center">
                        <span className="text-xs font-semibold mb-2" style={{ color: COLORS.inkSoft }}>MOST RECENT</span>
                        {latestBp ? (
                          <>
                            <div style={{ fontFamily: "'Space Grotesk', sans-serif", color: COLORS.primary }} className="text-4xl font-bold">
                              {latestBp.systolic}<span className="text-base" style={{ color: COLORS.inkSoft, fontWeight: 500 }}> mmHg</span>
                            </div>
                            <span className="text-xs font-semibold px-2.5 py-1 rounded-full mt-2" style={{ background: latestBpZone.color + "1a", color: latestBpZone.color }}>{latestBpZone.label}</span>
                            <span className="text-xs mt-2 text-center" style={{ color: COLORS.inkSoft }}>{formatDate(latestBp.created_at)} · {daysAgoLabel(latestBp.created_at)}</span>
                          </>
                        ) : (
                          <span className="text-xs text-center" style={{ color: COLORS.inkSoft }}>No data yet</span>
                        )}
                      </div>
                      <div onClick={() => { setMetricDetailId("bloodPressure"); setPage("metricDetail"); }} className="cursor-pointer rounded-xl transition-transform active:scale-[0.98]">
                        <span className="text-xs font-semibold block mb-1 text-center" style={{ color: COLORS.inkSoft }}>LAST 5 · TAP FOR MORE</span>
                        {bpReadings.length > 0 ? (
                          <HistoryBarChart
                            data={bpReadings.slice(-5)}
                            dataKey="systolic"
                            colorForEntry={(entry, i, arr) => (i === arr.length - 1 ? COLORS.primary : COLORS.muted)}
                            height={110}
                            showAxis={false}
                            maxBarSize={20}
                            referenceValue={activePatientProfile?.recommended_bp_systolic ?? 120}
                          />
                        ) : (
                          <div className="flex items-center justify-center" style={{ height: 110 }}>
                            <span className="text-xs" style={{ color: COLORS.inkSoft }}>No data</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 pt-6" style={{ borderTop: `1px solid ${COLORS.border}` }}>
                    <span className="text-sm font-semibold block mb-3" style={{ color: COLORS.primary }}>Diastolic (bottom number)</span>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex flex-col items-center justify-center">
                        <span className="text-xs font-semibold mb-2" style={{ color: COLORS.inkSoft }}>MOST RECENT</span>
                        {latestBp ? (
                          <>
                            <div style={{ fontFamily: "'Space Grotesk', sans-serif", color: COLORS.primary }} className="text-4xl font-bold">
                              {latestBp.diastolic}<span className="text-base" style={{ color: COLORS.inkSoft, fontWeight: 500 }}> mmHg</span>
                            </div>
                            <span className="text-xs font-semibold px-2.5 py-1 rounded-full mt-2" style={{ background: latestBpZone.color + "1a", color: latestBpZone.color }}>{latestBpZone.label}</span>
                            <span className="text-xs mt-2 text-center" style={{ color: COLORS.inkSoft }}>{formatDate(latestBp.created_at)} · {daysAgoLabel(latestBp.created_at)}</span>
                          </>
                        ) : (
                          <span className="text-xs text-center" style={{ color: COLORS.inkSoft }}>No data yet</span>
                        )}
                      </div>
                      <div onClick={() => { setMetricDetailId("bloodPressure"); setPage("metricDetail"); }} className="cursor-pointer rounded-xl transition-transform active:scale-[0.98]">
                        <span className="text-xs font-semibold block mb-1 text-center" style={{ color: COLORS.inkSoft }}>LAST 5 · TAP FOR MORE</span>
                        {bpReadings.length > 0 ? (
                          <HistoryBarChart
                            data={bpReadings.slice(-5)}
                            dataKey="diastolic"
                            colorForEntry={(entry, i, arr) => (i === arr.length - 1 ? COLORS.primary : COLORS.muted)}
                            height={110}
                            showAxis={false}
                            maxBarSize={20}
                            referenceValue={activePatientProfile?.recommended_bp_diastolic ?? 80}
                          />
                        ) : (
                          <div className="flex items-center justify-center" style={{ height: 110 }}>
                            <span className="text-xs" style={{ color: COLORS.inkSoft }}>No data</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>

                <Card>
                  <div className="flex items-center gap-2 mb-4">
                    <Droplet size={16} color={COLORS.primary} />
                    <span className="text-lg font-semibold" style={{ color: COLORS.primary, fontFamily: "'Space Grotesk', sans-serif" }}>Blood sugar</span>
                  </div>

                  <ActivitySection
                    bare
                    Icon={Droplet} label="Fasting" dataKey="value" unit=" mg/dL" decimals={0}
                    latest={latestFasting} prev={prevFasting} data={fastingEntries} color={COLORS.primary}
                    textColor={COLORS.primary}
                    recommendedValue={activePatientProfile?.recommended_sugar_fasting ?? 90}
                    onOpen={() => { setMetricDetailId("fastingSugar"); setPage("metricDetail"); }}
                  />

                  <div className="mt-6 pt-6" style={{ borderTop: `1px solid ${COLORS.border}` }}>
                    <ActivitySection
                      bare
                      Icon={Droplet} label="Non-fasting" dataKey="value" unit=" mg/dL" decimals={0}
                      latest={latestNonFasting} prev={prevNonFasting} data={nonFastingEntries} color={COLORS.primary}
                      textColor={COLORS.primary}
                      recommendedValue={activePatientProfile?.recommended_sugar_nonfasting ?? 120}
                      onOpen={() => { setMetricDetailId("nonFastingSugar"); setPage("metricDetail"); }}
                    />
                  </div>

                  <div className="mt-6 pt-6" style={{ borderTop: `1px solid ${COLORS.border}` }}>
                    <ActivitySection
                      bare
                      Icon={Droplet} label="HbA1c" dataKey="value" unit="%" decimals={1}
                      latest={latestA1c} prev={prevA1c} data={a1cEntries} color={COLORS.primary}
                      textColor={COLORS.primary}
                      recommendedValue={activePatientProfile?.recommended_sugar_a1c ?? 5.6}
                      onOpen={() => { setMetricDetailId("a1c"); setPage("metricDetail"); }}
                    />
                  </div>
                </Card>

                {profile.role === "Patient" && (
                  <Card>
                    <div className="flex items-center gap-2 mb-4">
                      <Activity size={16} color={COLORS.primary} />
                      <span className="text-sm font-semibold" style={{ color: COLORS.primary }}>Log blood pressure</span>
                    </div>
                    <div className="grid grid-cols-3 gap-3 mb-4">
                      <div><label className="text-xs block mb-1.5" style={{ color: COLORS.inkSoft }}>Systolic</label>
                        <input type="number" value={sys} onChange={(e) => setSys(e.target.value)} placeholder="120" className="w-full rounded-xl px-3 py-2.5 text-sm outline-none text-center" style={{ background: COLORS.surfaceAlt, border: `1px solid ${COLORS.border}`, color: COLORS.ink }} /></div>
                      <div><label className="text-xs block mb-1.5" style={{ color: COLORS.inkSoft }}>Diastolic</label>
                        <input type="number" value={dia} onChange={(e) => setDia(e.target.value)} placeholder="80" className="w-full rounded-xl px-3 py-2.5 text-sm outline-none text-center" style={{ background: COLORS.surfaceAlt, border: `1px solid ${COLORS.border}`, color: COLORS.ink }} /></div>
                      <div><label className="text-xs block mb-1.5" style={{ color: COLORS.inkSoft }}>Pulse</label>
                        <input type="number" value={pulse} onChange={(e) => setPulse(e.target.value)} placeholder="72" className="w-full rounded-xl px-3 py-2.5 text-sm outline-none text-center" style={{ background: COLORS.surfaceAlt, border: `1px solid ${COLORS.border}`, color: COLORS.ink }} /></div>
                    </div>
                    <button onClick={addBpReading} className="flex items-center gap-1.5 text-sm px-4 py-2.5 rounded-xl font-medium" style={{ background: COLORS.primary, color: "#fff" }}>
                      <Plus size={14} /> Save blood pressure
                    </button>
                  </Card>
                )}

                {profile.role === "Patient" && (
                  <Card>
                    <div className="flex items-center gap-2 mb-4">
                      <Droplet size={16} color={COLORS.primary} />
                      <span className="text-sm font-semibold" style={{ color: COLORS.primary }}>Log blood sugar</span>
                    </div>
                    <div className="grid grid-cols-3 gap-3 mb-4">
                      <div><label className="text-xs block mb-1.5" style={{ color: COLORS.inkSoft }}>Fasting</label>
                        <input type="number" value={fastingValue} onChange={(e) => setFastingValue(e.target.value)} placeholder="95" className="w-full rounded-xl px-3 py-2.5 text-sm outline-none text-center" style={{ background: COLORS.surfaceAlt, border: `1px solid ${COLORS.border}`, color: COLORS.ink }} /></div>
                      <div><label className="text-xs block mb-1.5" style={{ color: COLORS.inkSoft }}>Non-fasting</label>
                        <input type="number" value={nonFastingValue} onChange={(e) => setNonFastingValue(e.target.value)} placeholder="130" className="w-full rounded-xl px-3 py-2.5 text-sm outline-none text-center" style={{ background: COLORS.surfaceAlt, border: `1px solid ${COLORS.border}`, color: COLORS.ink }} /></div>
                      <div><label className="text-xs block mb-1.5" style={{ color: COLORS.inkSoft }}>HbA1c (%)</label>
                        <input type="number" step="0.1" value={a1cValue} onChange={(e) => setA1cValue(e.target.value)} placeholder="5.6" className="w-full rounded-xl px-3 py-2.5 text-sm outline-none text-center" style={{ background: COLORS.surfaceAlt, border: `1px solid ${COLORS.border}`, color: COLORS.ink }} /></div>
                    </div>
                    <button onClick={addSugarReadings} className="flex items-center gap-1.5 text-sm px-4 py-2.5 rounded-xl font-medium" style={{ background: COLORS.primary, color: "#fff" }}>
                      <Plus size={14} /> Save blood sugar
                    </button>
                  </Card>
                )}
              </>
            )}

            {labSubTab === "details" && (
              <>
                {LAB_DETAIL_SECTIONS.map((section) => (
                  <Card key={section.id}>
                    <span className="text-lg font-semibold block mb-3" style={{ color: COLORS.primary, fontFamily: "'Space Grotesk', sans-serif" }}>{section.label}</span>

                    <div
                      className={profile.role === "Patient" ? "grid gap-2 pb-1.5" : "grid gap-2 pb-1.5"}
                      style={{ gridTemplateColumns: profile.role === "Patient" ? "1fr auto 6.5rem" : "1fr auto", borderBottom: `1px solid ${COLORS.border}` }}
                    >
                      <span className="text-[10px] font-semibold tracking-wide" style={{ color: COLORS.inkSoft }}>METRIC</span>
                      <span className="text-[10px] font-semibold tracking-wide text-right" style={{ color: COLORS.inkSoft }}>LATEST</span>
                      {profile.role === "Patient" && (
                        <span className="text-[10px] font-semibold tracking-wide text-center" style={{ color: COLORS.inkSoft }}>NEW VALUE</span>
                      )}
                    </div>

                    {section.metrics.map((m) => {
                      const entries = labMetricReadings.filter((r) => r.metric_key === m.key);
                      const latest = entries[entries.length - 1];
                      return (
                        <div
                          key={m.key}
                          className="grid gap-2 items-center py-2"
                          style={{ gridTemplateColumns: profile.role === "Patient" ? "1fr auto 6.5rem" : "1fr auto", borderBottom: `1px solid ${COLORS.border}` }}
                        >
                          <span className="text-sm" style={{ color: COLORS.ink }}>{m.label}</span>
                          <span className="text-xs text-right whitespace-nowrap" style={{ color: latest ? COLORS.ink : COLORS.inkSoft }}>
                            {latest ? `${latest.value} · ${daysAgoLabel(latest.created_at)}` : "No data"}
                          </span>
                          {profile.role === "Patient" && (
                            <input
                              type="text"
                              value={labDetailDrafts[m.key] || ""}
                              onChange={(e) => setLabDetailDrafts({ ...labDetailDrafts, [m.key]: e.target.value })}
                              placeholder="Add"
                              className="w-full rounded-lg px-2 py-1.5 text-xs outline-none text-center"
                              style={{ background: COLORS.surfaceAlt, border: `1px solid ${COLORS.border}`, color: COLORS.ink }}
                            />
                          )}
                        </div>
                      );
                    })}

                    {profile.role === "Patient" && (
                      <button
                        onClick={() => saveLabDetailSection(section.id)}
                        className="flex items-center gap-1.5 text-sm px-4 py-2.5 rounded-xl font-medium mt-4"
                        style={{ background: COLORS.primary, color: "#fff" }}
                      >
                        {labDetailSaved === section.id ? <Check size={14} /> : <Plus size={14} />} {labDetailSaved === section.id ? "Saved" : "Save"}
                      </button>
                    )}
                  </Card>
                ))}
              </>
            )}

            {labSubTab === "upload" && (
              <Card>
                <div className="flex items-center gap-2 mb-4">
                  <FileText size={16} color={COLORS.primary} />
                  <span className="text-lg font-semibold" style={{ color: COLORS.primary, fontFamily: "'Space Grotesk', sans-serif" }}>Lab reports</span>
                </div>

                {profile.role === "Patient" && (
                  <div className="mb-5 pb-5" style={{ borderBottom: `1px solid ${COLORS.border}` }}>
                    <label className="text-xs block mb-1.5" style={{ color: COLORS.inkSoft }}>Upload a PDF or photo of your report</label>
                    <input
                      key={fileInputKey}
                      type="file"
                      accept=".pdf,image/*"
                      onChange={(e) => setSelectedFile(e.target.files[0] || null)}
                      className="w-full text-sm mb-3"
                      style={{ color: COLORS.ink }}
                    />
                    <button
                      onClick={uploadLabReport}
                      disabled={!selectedFile || uploadingFile}
                      className="flex items-center gap-1.5 text-sm px-4 py-2.5 rounded-xl font-medium"
                      style={{ background: COLORS.primary, color: "#fff", opacity: !selectedFile || uploadingFile ? 0.5 : 1 }}
                    >
                      <Plus size={14} /> {uploadingFile ? "Uploading..." : "Upload report"}
                    </button>
                  </div>
                )}

                <span className="text-xs font-semibold tracking-wide block mb-2" style={{ color: COLORS.inkSoft }}>UPLOADED REPORTS</span>
                {labReports.length === 0 ? (
                  <p className="text-sm" style={{ color: COLORS.inkSoft }}>No reports uploaded yet.</p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {labReports.map((r) => (
                      <button
                        key={r.id}
                        onClick={() => viewLabReport(r)}
                        className="flex items-center justify-between gap-3 rounded-xl p-3.5 text-left w-full"
                        style={{ background: COLORS.surfaceAlt }}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <FileText size={16} color={COLORS.primary} className="flex-shrink-0" />
                          <div className="min-w-0">
                            <p className="text-sm truncate" style={{ color: COLORS.ink }}>{r.file_name}</p>
                            <span className="text-xs" style={{ color: COLORS.inkSoft }}>{formatDate(r.created_at)} · {daysAgoLabel(r.created_at)}</span>
                          </div>
                        </div>
                        <ChevronRight size={16} color={COLORS.inkSoft} className="flex-shrink-0" />
                      </button>
                    ))}
                  </div>
                )}
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
                <span className="text-lg font-semibold" style={{ color: COLORS.primary, fontFamily: "'Space Grotesk', sans-serif" }}>Doctor</span>
              </div>

              <div
                className="flex gap-2 mb-5 sticky top-0 z-10 -mx-6 px-6 py-2"
                style={{ background: COLORS.surface, borderBottom: `1px solid ${COLORS.border}` }}
              >
                {[
                  { id: "prescription", label: "Prescription" },
                  { id: "messages", label: "Messages" },
                  { id: "appointments", label: "Appointments" },
                ].map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setDoctorSubTab(t.id)}
                    className="text-xs font-medium px-3 py-1.5 rounded-full transition-colors"
                    style={
                      doctorSubTab === t.id
                        ? { background: COLORS.primary, color: "#fff" }
                        : { background: COLORS.surfaceAlt, color: COLORS.inkSoft, border: `1px solid ${COLORS.border}` }
                    }
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {doctorSubTab === "prescription" && (
                <>
                  {[
                    { id: "medicine", label: "Medicine", current: medicinePrescriptions[0], past: medicinePrescriptions.slice(1) },
                    { id: "supplement", label: "Supplements", current: supplementPrescriptions[0], past: supplementPrescriptions.slice(1) },
                  ].map((section, i) => (
                    <div key={section.id} className={i > 0 ? "mt-6 pt-6" : ""} style={i > 0 ? { borderTop: `1px solid ${COLORS.border}` } : undefined}>
                      <span className="text-sm font-semibold block mb-3" style={{ color: COLORS.primary }}>{section.label}</span>

                      {profile.role === "Doctor" && (
                        <>
                          <textarea
                            value={prescriptionDrafts[section.id]}
                            onChange={(e) => setPrescriptionDrafts({ ...prescriptionDrafts, [section.id]: e.target.value })}
                            rows={4}
                            className="w-full rounded-xl px-3.5 py-3 text-sm outline-none mb-3 resize-none"
                            style={{ background: COLORS.surfaceAlt, border: `1px solid ${COLORS.border}`, color: COLORS.ink }}
                            placeholder={section.id === "medicine" ? "Write medicine instructions for your patient..." : "Write supplement recommendations for your patient..."}
                          />
                          <button onClick={() => savePrescription(section.id)} className="flex items-center gap-1.5 text-sm px-4 py-2.5 rounded-xl font-medium mb-5" style={{ background: COLORS.primary, color: "#fff" }}>
                            {prescriptionSaved === section.id ? <Check size={14} /> : <Plus size={14} />} {prescriptionSaved === section.id ? "Saved" : `Save ${section.label.toLowerCase()}`}
                          </button>
                        </>
                      )}

                      <div className="mb-4">
                        <span className="text-xs font-semibold tracking-wide block mb-2" style={{ color: COLORS.inkSoft }}>CURRENT</span>
                        {section.current ? (
                          <div className="rounded-xl p-3.5" style={{ background: COLORS.surfaceAlt }}>
                            <p className="text-sm leading-relaxed" style={{ color: COLORS.ink }}>{section.current.text}</p>
                            <div className="text-xs mt-2" style={{ color: COLORS.inkSoft }}>{formatDate(section.current.updated_at)} · {daysAgoLabel(section.current.updated_at)}</div>
                          </div>
                        ) : (
                          <p className="text-sm" style={{ color: COLORS.inkSoft }}>No {section.label.toLowerCase()} yet.</p>
                        )}
                      </div>

                      {section.past.length > 0 && (
                        <div>
                          <span className="text-xs font-semibold tracking-wide block mb-2" style={{ color: COLORS.inkSoft }}>PAST</span>
                          <div className="flex flex-col gap-2">
                            {section.past.map((p) => (
                              <div key={p.id} className="rounded-xl p-3.5" style={{ background: COLORS.surfaceAlt, opacity: 0.75 }}>
                                <p className="text-sm leading-relaxed" style={{ color: COLORS.ink }}>{p.text}</p>
                                <div className="text-xs mt-2" style={{ color: COLORS.inkSoft }}>{formatDate(p.updated_at)} · {daysAgoLabel(p.updated_at)}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
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
                    <button onClick={sendMessage} className="flex items-center gap-1.5 text-sm px-4 py-2.5 rounded-xl font-medium flex-shrink-0" style={{ background: COLORS.primary, color: "#fff" }}>
                      <Send size={14} /> Send
                    </button>
                  </div>
                </>
              )}

              {doctorSubTab === "appointments" && (
                <>
                  {profile.role === "Doctor" ? (
                    <>
                      <div className="mb-5">
                        <span className="text-sm font-semibold block mb-3" style={{ color: COLORS.ink }}>Open a new slot</span>
                        <div className="grid grid-cols-2 gap-3 mb-3">
                          <div>
                            <label className="text-xs block mb-1.5" style={{ color: COLORS.inkSoft }}>Date</label>
                            <input
                              type="date"
                              value={slotDate}
                              min={new Date().toISOString().split("T")[0]}
                              onChange={(e) => setSlotDate(e.target.value)}
                              className="w-full rounded-xl px-3 py-2.5 text-sm outline-none"
                              style={{ background: COLORS.surfaceAlt, border: `1px solid ${COLORS.border}`, color: COLORS.ink }}
                            />
                          </div>
                          <div>
                            <label className="text-xs block mb-1.5" style={{ color: COLORS.inkSoft }}>Time</label>
                            <input
                              type="time"
                              value={slotTime}
                              onChange={(e) => setSlotTime(e.target.value)}
                              className="w-full rounded-xl px-3 py-2.5 text-sm outline-none"
                              style={{ background: COLORS.surfaceAlt, border: `1px solid ${COLORS.border}`, color: COLORS.ink }}
                            />
                          </div>
                        </div>
                        <div className="mb-3">
                          <label className="text-xs block mb-1.5" style={{ color: COLORS.inkSoft }}>Duration</label>
                          <select
                            value={slotDuration}
                            onChange={(e) => setSlotDuration(e.target.value)}
                            className="w-full rounded-xl px-3.5 py-2.5 text-sm outline-none"
                            style={{ background: COLORS.surfaceAlt, border: `1px solid ${COLORS.border}`, color: COLORS.ink }}
                          >
                            <option value="15">15 min</option>
                            <option value="30">30 min</option>
                            <option value="45">45 min</option>
                            <option value="60">60 min</option>
                          </select>
                        </div>
                        <button onClick={addSlot} className="flex items-center gap-1.5 text-sm px-4 py-2.5 rounded-xl font-medium" style={{ background: COLORS.primary, color: "#fff" }}>
                          <Plus size={14} /> Add slot
                        </button>
                      </div>

                      <div className="mb-4">
                        <span className="text-xs font-semibold tracking-wide block mb-2" style={{ color: COLORS.inkSoft }}>YOUR UPCOMING APPOINTMENTS</span>
                        {doctorSlots.filter((s) => s.status === "booked").length === 0 ? (
                          <p className="text-sm" style={{ color: COLORS.inkSoft }}>No appointments booked yet.</p>
                        ) : (
                          <div className="flex flex-col gap-2">
                            {doctorSlots.filter((s) => s.status === "booked").map((s) => (
                              <div key={s.id} className="flex items-center justify-between gap-3 rounded-xl p-3.5" style={{ background: COLORS.surfaceAlt }}>
                                <div className="min-w-0">
                                  <p className="text-sm font-medium truncate" style={{ color: COLORS.ink }}>{patients.find((p) => p.id === s.patient_id)?.name || "Patient"}</p>
                                  <span className="text-xs" style={{ color: COLORS.inkSoft }}>{formatDate(s.slot_start)}</span>
                                </div>
                                <button onClick={() => cancelAppointment(s)} className="text-xs font-medium px-3 py-1.5 rounded-lg flex-shrink-0" style={{ background: COLORS.surface, color: COLORS.inkSoft, border: `1px solid ${COLORS.border}` }}>
                                  Cancel
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div>
                        <span className="text-xs font-semibold tracking-wide block mb-2" style={{ color: COLORS.inkSoft }}>YOUR OPEN SLOTS</span>
                        {doctorSlots.filter((s) => s.status === "open" && new Date(s.slot_start) >= new Date()).length === 0 ? (
                          <p className="text-sm" style={{ color: COLORS.inkSoft }}>No open slots yet.</p>
                        ) : (
                          <div className="flex flex-col gap-2">
                            {doctorSlots.filter((s) => s.status === "open" && new Date(s.slot_start) >= new Date()).map((s) => (
                              <div key={s.id} className="flex items-center justify-between gap-3 rounded-xl p-3.5" style={{ background: COLORS.surfaceAlt }}>
                                <span className="text-sm" style={{ color: COLORS.ink }}>{formatDate(s.slot_start)}</span>
                                <button onClick={() => removeSlot(s.id)} className="text-xs font-medium px-3 py-1.5 rounded-lg flex-shrink-0" style={{ background: COLORS.surface, color: COLORS.inkSoft, border: `1px solid ${COLORS.border}` }}>
                                  Remove
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="mb-4">
                        <label className="text-xs font-semibold block mb-2" style={{ color: COLORS.inkSoft }}>DOCTOR</label>
                        <select
                          value={selectedDoctorId || ""}
                          onChange={(e) => setSelectedDoctorId(e.target.value)}
                          className="w-full rounded-xl px-3.5 py-2.5 text-sm outline-none"
                          style={{ background: COLORS.surfaceAlt, border: `1px solid ${COLORS.border}`, color: COLORS.ink }}
                        >
                          {doctors.length === 0 && <option>No doctors yet</option>}
                          {doctors.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                        </select>
                      </div>

                      <div className="mb-5">
                        <span className="text-xs font-semibold tracking-wide block mb-2" style={{ color: COLORS.inkSoft }}>AVAILABLE SLOTS</span>
                        {availableSlots.length === 0 ? (
                          <p className="text-sm" style={{ color: COLORS.inkSoft }}>No open slots right now.</p>
                        ) : (
                          <div className="flex flex-col gap-2">
                            {availableSlots.map((s) => (
                              <div key={s.id} className="flex items-center justify-between gap-3 rounded-xl p-3.5" style={{ background: COLORS.surfaceAlt }}>
                                <span className="text-sm" style={{ color: COLORS.ink }}>{formatDate(s.slot_start)}</span>
                                <button onClick={() => bookSlot(s)} className="text-xs font-medium px-3 py-1.5 rounded-lg flex-shrink-0" style={{ background: COLORS.primary, color: "#fff" }}>
                                  Book
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div>
                        <span className="text-xs font-semibold tracking-wide block mb-2" style={{ color: COLORS.inkSoft }}>YOUR UPCOMING APPOINTMENTS</span>
                        {myAppointments.length === 0 ? (
                          <p className="text-sm" style={{ color: COLORS.inkSoft }}>No appointments booked yet.</p>
                        ) : (
                          <div className="flex flex-col gap-2">
                            {myAppointments.map((s) => (
                              <div key={s.id} className="flex items-center justify-between gap-3 rounded-xl p-3.5" style={{ background: COLORS.surfaceAlt }}>
                                <div className="min-w-0">
                                  <p className="text-sm font-medium truncate" style={{ color: COLORS.ink }}>{doctors.find((d) => d.id === s.doctor_id)?.name || "Doctor"}</p>
                                  <span className="text-xs" style={{ color: COLORS.inkSoft }}>{formatDate(s.slot_start)}</span>
                                </div>
                                <button onClick={() => cancelAppointment(s)} className="text-xs font-medium px-3 py-1.5 rounded-lg flex-shrink-0" style={{ background: COLORS.surface, color: COLORS.inkSoft, border: `1px solid ${COLORS.border}` }}>
                                  Cancel
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </>
              )}
            </Card>
          </>
        )}

        {activeTab === "profile" && (
          <Card>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <User size={16} color={COLORS.primary} />
                <span className="text-lg font-semibold" style={{ color: COLORS.primary, fontFamily: "'Space Grotesk', sans-serif" }}>Profile</span>
              </div>
              <button
                onClick={() => setPage("settings")}
                className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: COLORS.surfaceAlt, border: `1px solid ${COLORS.border}` }}
              >
                <SettingsIcon size={16} color={COLORS.inkSoft} />
              </button>
            </div>

            <div
              className="flex gap-2 mb-5 overflow-x-auto sticky top-0 z-10 -mx-6 px-6 py-2"
              style={{ background: COLORS.surface, borderBottom: `1px solid ${COLORS.border}` }}
            >
              {[
                { id: "personal", label: "Personal" },
                { id: "medical", label: "Medical" },
                { id: "family", label: "Family" },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setProfileSubTab(t.id)}
                  className="text-xs font-medium px-3 py-1.5 rounded-full transition-colors flex-shrink-0"
                  style={
                    profileSubTab === t.id
                      ? { background: COLORS.primary, color: "#fff" }
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

                <button onClick={savePersonal} className="flex items-center gap-1.5 text-sm px-4 py-2.5 rounded-xl font-medium" style={{ background: COLORS.primary, color: "#fff" }}>
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

                <button onClick={saveMedicalBackground} className="flex items-center gap-1.5 text-sm px-4 py-2.5 rounded-xl font-medium" style={{ background: COLORS.primary, color: "#fff" }}>
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

                <button onClick={saveFamilyHistory} className="flex items-center gap-1.5 text-sm px-4 py-2.5 rounded-xl font-medium" style={{ background: COLORS.primary, color: "#fff" }}>
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
