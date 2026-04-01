"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from "recharts";

// ─── Types ───────────────────────────────────────────────────

type Participant = {
  id: string;
  name: string;
  email: string;
  age: number | null;
  gender: string;
  occupation: string;
  monthly_spending_range: string;
  quick_commerce_usage: string;
  assigned_group: "dark_pattern" | "ethical";
  created_at: string;
};

type Session = {
  id: string;
  participant_id: string;
  assigned_group: string;
  started_at: string;
  completed_at: string | null;
  total_duration_seconds: number | null;
};

type CheckoutData = {
  session_id: string;
  subtotal: number;
  delivery_fee: number;
  platform_fee: number;
  handling_fee: number;
  surge_fee: number;
  tip_amount: number;
  charity_amount: number;
  total_amount: number;
  delivery_option: string;
  items_in_cart: number;
  addons_accepted: number;
  addons_declined: number;
};

type SurveyResponse = {
  session_id: string;
  q_autonomy: number;
  q_transparency: number;
  q_pressure: number;
  q_trust: number;
  q_return_intent: number;
  q_price_expectation: number;
  q_ease_of_decline: number;
  q_unfair_experience: string;
  q_change_suggestion: string;
  q_additional_comments: string;
};

type Interaction = {
  id: string;
  session_id: string;
  event_type: string;
  event_target: string | null;
  event_value: string | null;
  screen: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

type ParticipantRow = Participant & {
  session: Session | null;
  checkout: CheckoutData | null;
  survey: SurveyResponse | null;
  interactions: Interaction[];
  deviceInfo: Record<string, unknown> | null;
};

// ─── Constants ───────────────────────────────────────────────

const COLORS = {
  dark: "#dc2626",
  ethical: "#16a34a",
  purple: "#7B2D8E",
  blue: "#3b82f6",
  orange: "#f97316",
  pink: "#ec4899",
  teal: "#14b8a6",
  indigo: "#6366f1",
};

const PIE_COLORS = [
  "#7B2D8E",
  "#3b82f6",
  "#f97316",
  "#14b8a6",
  "#ec4899",
  "#6366f1",
  "#eab308",
  "#64748b",
];

const LIKERT_KEYS = [
  { key: "q_autonomy", label: "Autonomy" },
  { key: "q_transparency", label: "Transparency" },
  { key: "q_pressure", label: "Pressure" },
  { key: "q_trust", label: "Trust" },
  { key: "q_return_intent", label: "Return Intent" },
  { key: "q_price_expectation", label: "Price Fair" },
  { key: "q_ease_of_decline", label: "Ease of Decline" },
];

// ─── Helpers ─────────────────────────────────────────────────

function mean(nums: number[]) {
  if (nums.length === 0) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function stdDev(nums: number[]) {
  if (nums.length < 2) return 0;
  const m = mean(nums);
  return Math.sqrt(nums.reduce((s, n) => s + (n - m) ** 2, 0) / (nums.length - 1));
}

function fmt(n: number) {
  return n.toFixed(1);
}

// ─── Password Gate ───────────────────────────────────────────

function PasswordGate({ onAuth }: { onAuth: () => void }) {
  const [pw, setPw] = useState("");
  const [error, setError] = useState(false);
  const [checking, setChecking] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setChecking(true);
    setError(false);
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: pw }),
      });
      if (res.ok) {
        onAuth();
      } else {
        setError(true);
        setPw("");
      }
    } catch {
      setError(true);
    } finally {
      setChecking(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-sm space-y-4"
      >
        <div className="text-center">
          <div className="text-3xl mb-2">🔒</div>
          <h1 className="text-xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-sm text-gray-500">Enter password to continue</p>
        </div>
        <input
          type="password"
          value={pw}
          onChange={(e) => {
            setPw(e.target.value);
            setError(false);
          }}
          placeholder="Password"
          className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#7B2D8E]/50 focus:border-[#7B2D8E]"
          autoFocus
        />
        {error && (
          <p className="text-sm text-red-600">Incorrect password</p>
        )}
        <button
          type="submit"
          disabled={checking}
          className="w-full bg-[#7B2D8E] hover:bg-[#6A2579] text-white py-2.5 rounded-lg font-medium text-sm cursor-pointer disabled:opacity-50"
        >
          {checking ? "Checking..." : "Enter"}
        </button>
      </form>
    </div>
  );
}

// ─── Summary Card ────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5">
      <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
      <p
        className="text-2xl sm:text-3xl font-bold mt-1"
        style={{ color: color || "#111" }}
      >
        {value}
      </p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

// ─── Participant Detail ──────────────────────────────────────

function ParticipantDetail({
  row,
  onClose,
}: {
  row: ParticipantRow;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<"overview" | "interactions" | "raw">(
    "overview"
  );

  const screenTimes = useMemo(() => {
    const exits = row.interactions.filter((i) => i.event_type === "screen_exit");
    const times: Record<string, number> = {};
    exits.forEach((e) => {
      const dur = (e.metadata?.duration_seconds as number) || 0;
      const screen = e.screen || "unknown";
      times[screen] = (times[screen] || 0) + dur;
    });
    return Object.entries(times).map(([screen, seconds]) => ({
      screen,
      seconds: Math.round(seconds * 10) / 10,
    }));
  }, [row.interactions]);

  const radarData = useMemo(() => {
    if (!row.survey) return [];
    return LIKERT_KEYS.map((q) => ({
      question: q.label,
      score: row.survey![q.key as keyof SurveyResponse] as number,
    }));
  }, [row.survey]);

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center overflow-y-auto p-4 pt-8 pb-8">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b">
          <div>
            <h2 className="text-lg font-bold text-gray-900">{row.name}</h2>
            <p className="text-sm text-gray-500">{row.email}</p>
          </div>
          <div className="flex items-center gap-3">
            <span
              className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                row.assigned_group === "dark_pattern"
                  ? "bg-red-100 text-red-700"
                  : "bg-green-100 text-green-700"
              }`}
            >
              {row.assigned_group === "dark_pattern" ? "Dark Pattern" : "Ethical"}
            </span>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 cursor-pointer"
            >
              &times;
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b px-4 sm:px-6 gap-4">
          {(["overview", "interactions", "raw"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`py-3 text-sm font-medium border-b-2 transition-colors cursor-pointer ${
                tab === t
                  ? "border-[#7B2D8E] text-[#7B2D8E]"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {t === "overview"
                ? "Overview"
                : t === "interactions"
                ? "Timeline"
                : "Raw Data"}
            </button>
          ))}
        </div>

        <div className="p-4 sm:p-6 max-h-[70vh] overflow-y-auto">
          {tab === "overview" && (
            <div className="space-y-6">
              {/* Demographics */}
              <section>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">
                  Demographics
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                  <div>
                    <span className="text-gray-500">Age:</span>{" "}
                    <span className="font-medium">{row.age ?? "—"}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Gender:</span>{" "}
                    <span className="font-medium">{row.gender}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Occupation:</span>{" "}
                    <span className="font-medium">{row.occupation}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Spending:</span>{" "}
                    <span className="font-medium">
                      {row.monthly_spending_range}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">Usage:</span>{" "}
                    <span className="font-medium">
                      {row.quick_commerce_usage}
                    </span>
                  </div>
                </div>
              </section>

              {/* Device Info */}
              {row.deviceInfo && (
                <section>
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">
                    Device Info
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                    <div>
                      <span className="text-gray-500">Device:</span>{" "}
                      <span className="font-medium">
                        {row.deviceInfo.device_type as string}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Browser:</span>{" "}
                      <span className="font-medium">
                        {row.deviceInfo.browser as string}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">OS:</span>{" "}
                      <span className="font-medium">
                        {row.deviceInfo.os as string}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Screen:</span>{" "}
                      <span className="font-medium">
                        {row.deviceInfo.screen_width as number}&times;
                        {row.deviceInfo.screen_height as number}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Viewport:</span>{" "}
                      <span className="font-medium">
                        {row.deviceInfo.viewport_width as number}&times;
                        {row.deviceInfo.viewport_height as number}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Touch:</span>{" "}
                      <span className="font-medium">
                        {row.deviceInfo.touch_support ? "Yes" : "No"}
                      </span>
                    </div>
                  </div>
                </section>
              )}

              {/* Checkout Breakdown */}
              {row.checkout && (
                <section>
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">
                    Checkout
                  </h3>
                  <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Subtotal</span>
                      <span>₹{row.checkout.subtotal}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Delivery fee</span>
                      <span>
                        {row.checkout.delivery_fee === 0
                          ? "Free"
                          : `₹${row.checkout.delivery_fee}`}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Platform fee</span>
                      <span>₹{row.checkout.platform_fee}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Handling fee</span>
                      <span>₹{row.checkout.handling_fee}</span>
                    </div>
                    {row.checkout.surge_fee > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Surge fee</span>
                        <span>₹{row.checkout.surge_fee}</span>
                      </div>
                    )}
                    {row.checkout.tip_amount > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Tip</span>
                        <span>₹{row.checkout.tip_amount}</span>
                      </div>
                    )}
                    {row.checkout.charity_amount > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Charity</span>
                        <span>₹{row.checkout.charity_amount}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-bold text-base border-t pt-2 mt-2">
                      <span>Total</span>
                      <span>₹{row.checkout.total_amount}</span>
                    </div>
                    <div className="flex justify-between text-xs text-gray-500 mt-2 pt-2 border-t">
                      <span>
                        Delivery: {row.checkout.delivery_option}
                      </span>
                      <span>
                        Items: {row.checkout.items_in_cart} | Addons:{" "}
                        {row.checkout.addons_accepted} accepted,{" "}
                        {row.checkout.addons_declined} declined
                      </span>
                    </div>
                  </div>
                </section>
              )}

              {/* Survey Responses */}
              {row.survey && (
                <section>
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">
                    Survey Responses
                  </h3>
                  <div className="h-64 sm:h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart data={radarData}>
                        <PolarGrid />
                        <PolarAngleAxis
                          dataKey="question"
                          tick={{ fontSize: 11 }}
                        />
                        <PolarRadiusAxis
                          angle={90}
                          domain={[1, 7]}
                          tick={{ fontSize: 10 }}
                        />
                        <Radar
                          dataKey="score"
                          stroke={COLORS.purple}
                          fill={COLORS.purple}
                          fillOpacity={0.3}
                        />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                  {/* Likert scores as numbers */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3">
                    {LIKERT_KEYS.map((q) => (
                      <div
                        key={q.key}
                        className="bg-gray-50 rounded-lg p-2 text-center"
                      >
                        <p className="text-xs text-gray-500">{q.label}</p>
                        <p className="text-lg font-bold text-gray-900">
                          {row.survey![q.key as keyof SurveyResponse] as number}
                          <span className="text-xs text-gray-400 font-normal">
                            /7
                          </span>
                        </p>
                      </div>
                    ))}
                  </div>
                  {/* Open-ended */}
                  <div className="mt-4 space-y-3">
                    <div>
                      <p className="text-xs text-gray-500 mb-1">
                        What felt unfair?
                      </p>
                      <p className="text-sm text-gray-800 bg-gray-50 rounded-lg p-3">
                        {row.survey.q_unfair_experience || "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">
                        What would you change?
                      </p>
                      <p className="text-sm text-gray-800 bg-gray-50 rounded-lg p-3">
                        {row.survey.q_change_suggestion || "—"}
                      </p>
                    </div>
                    {row.survey.q_additional_comments && (
                      <div>
                        <p className="text-xs text-gray-500 mb-1">
                          Additional comments
                        </p>
                        <p className="text-sm text-gray-800 bg-gray-50 rounded-lg p-3">
                          {row.survey.q_additional_comments}
                        </p>
                      </div>
                    )}
                  </div>
                </section>
              )}

              {/* Screen Times */}
              {screenTimes.length > 0 && (
                <section>
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">
                    Time per Screen (seconds)
                  </h3>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={screenTimes}>
                        <XAxis dataKey="screen" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Bar
                          dataKey="seconds"
                          fill={COLORS.purple}
                          radius={[4, 4, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </section>
              )}
            </div>
          )}

          {tab === "interactions" && (
            <div className="space-y-1 text-xs font-mono">
              {row.interactions.map((i, idx) => (
                <div
                  key={idx}
                  className="flex flex-wrap gap-x-3 gap-y-0.5 py-1.5 border-b border-gray-100"
                >
                  <span className="text-gray-400 shrink-0">
                    {new Date(i.created_at).toLocaleTimeString()}
                  </span>
                  <span className="font-semibold text-gray-700">
                    {i.event_type}
                  </span>
                  {i.screen && (
                    <span className="text-purple-600">@{i.screen}</span>
                  )}
                  {i.event_target && (
                    <span className="text-blue-600">{i.event_target}</span>
                  )}
                  {i.event_value && (
                    <span className="text-orange-600">={i.event_value}</span>
                  )}
                  {Object.keys(i.metadata || {}).length > 0 && (
                    <span className="text-gray-400 break-all">
                      {JSON.stringify(i.metadata)}
                    </span>
                  )}
                </div>
              ))}
              {row.interactions.length === 0 && (
                <p className="text-gray-400 py-4 text-center text-sm">
                  No interaction data
                </p>
              )}
            </div>
          )}

          {tab === "raw" && (
            <pre className="text-xs bg-gray-50 rounded-xl p-4 overflow-x-auto whitespace-pre-wrap break-words max-h-[60vh]">
              {JSON.stringify(
                {
                  participant: {
                    id: row.id,
                    name: row.name,
                    email: row.email,
                    age: row.age,
                    gender: row.gender,
                    occupation: row.occupation,
                    monthly_spending_range: row.monthly_spending_range,
                    quick_commerce_usage: row.quick_commerce_usage,
                    assigned_group: row.assigned_group,
                    created_at: row.created_at,
                  },
                  session: row.session,
                  device: row.deviceInfo,
                  checkout: row.checkout,
                  survey: row.survey,
                  interactions: row.interactions,
                },
                null,
                2
              )}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Admin Dashboard ────────────────────────────────────

function AdminDashboard() {
  const [rows, setRows] = useState<ParticipantRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<ParticipantRow | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);

    const [
      { data: participants },
      { data: sessions },
      { data: checkouts },
      { data: surveys },
      { data: interactions },
    ] = await Promise.all([
      supabase.from("participants").select("*").order("created_at", { ascending: false }),
      supabase.from("sessions").select("*"),
      supabase.from("checkout_data").select("*"),
      supabase.from("survey_responses").select("*"),
      supabase.from("interactions").select("*").order("created_at", { ascending: true }),
    ]);

    const sessionMap = new Map<string, Session>();
    (sessions || []).forEach((s: Session) =>
      sessionMap.set(s.participant_id, s)
    );

    const checkoutMap = new Map<string, CheckoutData>();
    (checkouts || []).forEach((c: CheckoutData) =>
      checkoutMap.set(c.session_id, c)
    );

    const surveyMap = new Map<string, SurveyResponse>();
    (surveys || []).forEach((s: SurveyResponse) =>
      surveyMap.set(s.session_id, s)
    );

    const interactionMap = new Map<string, Interaction[]>();
    (interactions || []).forEach((i: Interaction) => {
      if (!interactionMap.has(i.session_id))
        interactionMap.set(i.session_id, []);
      interactionMap.get(i.session_id)!.push(i);
    });

    const combined: ParticipantRow[] = (participants || []).map(
      (p: Participant) => {
        const session = sessionMap.get(p.id) || null;
        const sid = session?.id || "";
        const ints = interactionMap.get(sid) || [];
        const deviceEvent = ints.find((i) => i.event_type === "device_info");

        return {
          ...p,
          session,
          checkout: checkoutMap.get(sid) || null,
          survey: surveyMap.get(sid) || null,
          interactions: ints,
          deviceInfo: deviceEvent
            ? (deviceEvent.metadata as Record<string, unknown>)
            : null,
        };
      }
    );

    setRows(combined);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ─── Computed stats ──────────────────────────────────────

  const stats = useMemo(() => {
    const dark = rows.filter((r) => r.assigned_group === "dark_pattern");
    const ethical = rows.filter((r) => r.assigned_group === "ethical");
    const completed = rows.filter((r) => r.survey);

    const darkComplete = dark.filter((r) => r.survey);
    const ethicalComplete = ethical.filter((r) => r.survey);

    // Survey means per group
    const surveyComparison = LIKERT_KEYS.map((q) => {
      const darkScores = darkComplete
        .map((r) => r.survey![q.key as keyof SurveyResponse] as number)
        .filter(Boolean);
      const ethicalScores = ethicalComplete
        .map((r) => r.survey![q.key as keyof SurveyResponse] as number)
        .filter(Boolean);
      return {
        question: q.label,
        "Dark Pattern": +mean(darkScores).toFixed(2),
        Ethical: +mean(ethicalScores).toFixed(2),
        dark_sd: stdDev(darkScores),
        ethical_sd: stdDev(ethicalScores),
      };
    });

    // Cart totals
    const darkTotals = dark
      .map((r) => r.checkout?.total_amount)
      .filter(Boolean) as number[];
    const ethicalTotals = ethical
      .map((r) => r.checkout?.total_amount)
      .filter(Boolean) as number[];

    // Behavioral
    const darkExpressRate = dark.filter(
      (r) => r.checkout?.delivery_option === "express"
    ).length;
    const ethicalExpressRate = ethical.filter(
      (r) => r.checkout?.delivery_option === "express"
    ).length;

    const darkTipKept = dark.filter(
      (r) => r.checkout && r.checkout.tip_amount > 0
    ).length;
    const ethicalTipKept = ethical.filter(
      (r) => r.checkout && r.checkout.tip_amount > 0
    ).length;

    const darkCharityKept = dark.filter(
      (r) => r.checkout && r.checkout.charity_amount > 0
    ).length;
    const ethicalCharityKept = ethical.filter(
      (r) => r.checkout && r.checkout.charity_amount > 0
    ).length;

    // Device breakdown
    const deviceTypes: Record<string, number> = {};
    const browsers: Record<string, number> = {};
    rows.forEach((r) => {
      const dt = (r.deviceInfo?.device_type as string) || "unknown";
      const br = (r.deviceInfo?.browser as string) || "unknown";
      deviceTypes[dt] = (deviceTypes[dt] || 0) + 1;
      browsers[br] = (browsers[br] || 0) + 1;
    });

    // Gender breakdown
    const genders: Record<string, number> = {};
    rows.forEach((r) => {
      genders[r.gender] = (genders[r.gender] || 0) + 1;
    });

    return {
      total: rows.length,
      dark: dark.length,
      ethical: ethical.length,
      completed: completed.length,
      surveyComparison,
      darkCartMean: mean(darkTotals),
      darkCartSd: stdDev(darkTotals),
      ethicalCartMean: mean(ethicalTotals),
      ethicalCartSd: stdDev(ethicalTotals),
      behavioral: [
        {
          metric: "Express Delivery",
          "Dark Pattern": dark.length
            ? Math.round((darkExpressRate / dark.length) * 100)
            : 0,
          Ethical: ethical.length
            ? Math.round((ethicalExpressRate / ethical.length) * 100)
            : 0,
        },
        {
          metric: "Kept Tip",
          "Dark Pattern": dark.length
            ? Math.round((darkTipKept / dark.length) * 100)
            : 0,
          Ethical: ethical.length
            ? Math.round((ethicalTipKept / ethical.length) * 100)
            : 0,
        },
        {
          metric: "Donated Charity",
          "Dark Pattern": dark.length
            ? Math.round((darkCharityKept / dark.length) * 100)
            : 0,
          Ethical: ethical.length
            ? Math.round((ethicalCharityKept / ethical.length) * 100)
            : 0,
        },
      ],
      deviceTypes: Object.entries(deviceTypes).map(([name, value]) => ({
        name,
        value,
      })),
      browsers: Object.entries(browsers).map(([name, value]) => ({
        name,
        value,
      })),
      genders: Object.entries(genders).map(([name, value]) => ({
        name,
        value,
      })),
    };
  }, [rows]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-[#7B2D8E] border-t-transparent rounded-full mx-auto" />
          <p className="mt-3 text-sm text-gray-500">Loading data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-gray-900">
              DRM Experiment Dashboard
            </h1>
            <p className="text-xs text-gray-500">
              Quick Commerce Checkout Study — Arhaan Bahadur, IIIT Delhi
            </p>
          </div>
          <button
            onClick={fetchData}
            className="text-xs bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg text-gray-600 cursor-pointer"
          >
            Refresh
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-8">
        {/* ─── Summary Cards ──────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <StatCard
            label="Total Participants"
            value={stats.total}
            sub={`${stats.completed} completed`}
          />
          <StatCard
            label="Dark Pattern"
            value={stats.dark}
            color={COLORS.dark}
          />
          <StatCard
            label="Ethical"
            value={stats.ethical}
            color={COLORS.ethical}
          />
          <StatCard
            label="Completion Rate"
            value={
              stats.total
                ? `${Math.round((stats.completed / stats.total) * 100)}%`
                : "—"
            }
          />
        </div>

        {/* ─── Group Comparison: Survey Scores ─────── */}
        <section className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-1">
            Survey Scores: Dark Pattern vs Ethical
          </h2>
          <p className="text-xs text-gray-500 mb-4">
            Mean Likert scores (1-7 scale). Higher = stronger agreement.
          </p>
          <div className="h-64 sm:h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.surveyComparison}>
                <XAxis dataKey="question" tick={{ fontSize: 10 }} angle={-20} textAnchor="end" height={50} />
                <YAxis domain={[1, 7]} tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(value) => fmt(Number(value))}
                  contentStyle={{ fontSize: 12 }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar
                  dataKey="Dark Pattern"
                  fill={COLORS.dark}
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="Ethical"
                  fill={COLORS.ethical}
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
          {/* Stats table */}
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-gray-500 border-b">
                  <th className="pb-2 pr-4">Metric</th>
                  <th className="pb-2 pr-4">Dark (M &plusmn; SD)</th>
                  <th className="pb-2">Ethical (M &plusmn; SD)</th>
                </tr>
              </thead>
              <tbody>
                {stats.surveyComparison.map((q) => (
                  <tr key={q.question} className="border-b border-gray-100">
                    <td className="py-1.5 pr-4 text-gray-700">{q.question}</td>
                    <td className="py-1.5 pr-4 font-mono">
                      {fmt(q["Dark Pattern"])} &plusmn; {fmt(q.dark_sd)}
                    </td>
                    <td className="py-1.5 font-mono">
                      {fmt(q.Ethical)} &plusmn; {fmt(q.ethical_sd)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* ─── Behavioral Metrics + Cart Total ─────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Cart totals */}
          <section className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-6">
            <h2 className="text-sm font-semibold text-gray-900 mb-1">
              Average Cart Total
            </h2>
            <p className="text-xs text-gray-500 mb-4">
              Revenue comparison between groups
            </p>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={[
                    {
                      group: "Dark Pattern",
                      total: +stats.darkCartMean.toFixed(0),
                    },
                    {
                      group: "Ethical",
                      total: +stats.ethicalCartMean.toFixed(0),
                    },
                  ]}
                >
                  <XAxis dataKey="group" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    formatter={(value) => [`₹${value}`, "Avg Total"]}
                    contentStyle={{ fontSize: 12 }}
                  />
                  <Bar dataKey="total" radius={[6, 6, 0, 0]}>
                    <Cell fill={COLORS.dark} />
                    <Cell fill={COLORS.ethical} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2 flex gap-4 text-xs text-gray-600">
              <span>
                Dark: ₹{fmt(stats.darkCartMean)} &plusmn; ₹{fmt(stats.darkCartSd)}
              </span>
              <span>
                Ethical: ₹{fmt(stats.ethicalCartMean)} &plusmn; ₹
                {fmt(stats.ethicalCartSd)}
              </span>
            </div>
          </section>

          {/* Behavioral rates */}
          <section className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-6">
            <h2 className="text-sm font-semibold text-gray-900 mb-1">
              Behavioral Metrics (%)
            </h2>
            <p className="text-xs text-gray-500 mb-4">
              % of participants who kept pre-selected options
            </p>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.behavioral}>
                  <XAxis dataKey="metric" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                  <Tooltip
                    formatter={(value) => [`${value}%`]}
                    contentStyle={{ fontSize: 12 }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar
                    dataKey="Dark Pattern"
                    fill={COLORS.dark}
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="Ethical"
                    fill={COLORS.ethical}
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>
        </div>

        {/* ─── Demographics & Device Charts ─────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
          {[
            { title: "Gender", data: stats.genders },
            { title: "Device Type", data: stats.deviceTypes },
            { title: "Browser", data: stats.browsers },
          ].map((chart) => {
            const total = chart.data.reduce((s, d) => s + d.value, 0);
            return (
              <section
                key={chart.title}
                className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-6"
              >
                <h2 className="text-sm font-semibold text-gray-900 mb-3">
                  {chart.title}
                </h2>
                <div className="h-40">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={chart.data}
                        cx="50%"
                        cy="50%"
                        innerRadius={30}
                        outerRadius={60}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {chart.data.map((_, i) => (
                          <Cell
                            key={i}
                            fill={PIE_COLORS[i % PIE_COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value) => [value, "Count"]}
                        contentStyle={{ fontSize: 12 }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
                  {chart.data.map((d, i) => (
                    <div key={d.name} className="flex items-center gap-1.5 text-xs text-gray-600">
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }}
                      />
                      <span>{d.name}</span>
                      <span className="text-gray-400">
                        {total ? `${Math.round((d.value / total) * 100)}%` : ""}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            );
          })}
        </div>

        {/* ─── Participants Table ──────────────────── */}
        <section className="bg-white rounded-2xl border border-gray-200">
          <div className="p-4 sm:p-6 border-b">
            <h2 className="text-sm font-semibold text-gray-900">
              All Participants ({rows.length})
            </h2>
            <p className="text-xs text-gray-500">
              Click a row to view detailed analysis
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500 border-b bg-gray-50">
                  <th className="px-4 py-3 font-medium">#</th>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium hidden sm:table-cell">
                    Email
                  </th>
                  <th className="px-4 py-3 font-medium">Group</th>
                  <th className="px-4 py-3 font-medium hidden md:table-cell">
                    Device
                  </th>
                  <th className="px-4 py-3 font-medium">Total</th>
                  <th className="px-4 py-3 font-medium hidden lg:table-cell">
                    Survey
                  </th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr
                    key={row.id}
                    onClick={() => setSelected(row)}
                    className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3 text-gray-400">{i + 1}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {row.name}
                    </td>
                    <td className="px-4 py-3 text-gray-500 hidden sm:table-cell">
                      {row.email}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                          row.assigned_group === "dark_pattern"
                            ? "bg-red-100 text-red-700"
                            : "bg-green-100 text-green-700"
                        }`}
                      >
                        {row.assigned_group === "dark_pattern"
                          ? "Dark"
                          : "Ethical"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs hidden md:table-cell">
                      {(row.deviceInfo?.device_type as string) || "—"}
                      {row.deviceInfo?.browser
                        ? ` / ${row.deviceInfo.browser}`
                        : ""}
                    </td>
                    <td className="px-4 py-3 font-mono text-gray-900">
                      {row.checkout ? `₹${row.checkout.total_amount}` : "—"}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 hidden lg:table-cell">
                      {row.survey
                        ? `A:${row.survey.q_autonomy} T:${row.survey.q_trust} P:${row.survey.q_pressure}`
                        : "—"}
                    </td>
                    <td className="px-4 py-3">
                      {row.survey ? (
                        <span className="text-xs text-green-600 font-medium">
                          Complete
                        </span>
                      ) : row.checkout ? (
                        <span className="text-xs text-yellow-600 font-medium">
                          In Survey
                        </span>
                      ) : row.session ? (
                        <span className="text-xs text-blue-600 font-medium">
                          In Prototype
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">Started</span>
                      )}
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-4 py-12 text-center text-gray-400"
                    >
                      No participants yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* ─── Raw Export ──────────────────────────── */}
        <section className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-gray-900">
                Export Raw Data
              </h2>
              <p className="text-xs text-gray-500">
                Full JSON dump of all collected data
              </p>
            </div>
            <button
              onClick={() => {
                const blob = new Blob(
                  [JSON.stringify(rows, null, 2)],
                  { type: "application/json" }
                );
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `drm-experiment-data-${new Date().toISOString().slice(0, 10)}.json`;
                a.click();
                URL.revokeObjectURL(url);
              }}
              className="text-xs bg-[#7B2D8E] hover:bg-[#6A2579] text-white px-4 py-2 rounded-lg cursor-pointer font-medium"
            >
              Download JSON
            </button>
          </div>
          <pre className="text-xs bg-gray-50 rounded-xl p-4 overflow-x-auto max-h-64 whitespace-pre-wrap break-words">
            {JSON.stringify(
              rows.map((r) => ({
                name: r.name,
                group: r.assigned_group,
                device: r.deviceInfo?.device_type,
                browser: r.deviceInfo?.browser,
                total: r.checkout?.total_amount,
                autonomy: r.survey?.q_autonomy,
                trust: r.survey?.q_trust,
                pressure: r.survey?.q_pressure,
              })),
              null,
              2
            )}
          </pre>
        </section>
      </div>

      {/* Detail modal */}
      {selected && (
        <ParticipantDetail
          row={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}

// ─── Page Export ──────────────────────────────────────────────

export default function AdminPage() {
  const [authed, setAuthed] = useState(false);
  const [checking, setChecking] = useState(true);

  // Check for existing session cookie on mount
  useEffect(() => {
    fetch("/api/admin")
      .then((res) => {
        if (res.ok) setAuthed(true);
      })
      .finally(() => setChecking(false));
  }, []);

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin w-8 h-8 border-4 border-[#7B2D8E] border-t-transparent rounded-full" />
      </div>
    );
  }

  return authed ? (
    <AdminDashboard />
  ) : (
    <PasswordGate onAuth={() => setAuthed(true)} />
  );
}
