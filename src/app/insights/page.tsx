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
  ReferenceLine,
  CartesianGrid,
} from "recharts";

// ─── Types ───────────────────────────────────────────────────

type Participant = {
  id: string;
  name: string;
  age: number | null;
  gender: string;
  occupation: string;
  monthly_spending_range: string;
  quick_commerce_usage: string;
  assigned_group: "dark_pattern" | "ethical";
};

type Session = {
  id: string;
  participant_id: string;
  assigned_group: string;
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
  extra_revenue: number;
  sneaked_item_kept: boolean;
  promo_code: string | null;
  promo_discount: number;
  promo_attempts: number;
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
  session_id: string;
  event_type: string;
  event_target: string | null;
  screen: string | null;
  metadata: Record<string, unknown>;
};

type Row = Participant & {
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
  darkLight: "#fecaca",
  ethicalLight: "#bbf7d0",
  purple: "#7B2D8E",
  neutral: "#94a3b8",
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

// DV mapping per assignment
const HYPOTHESIS_QUESTIONS = {
  h1: [
    { key: "q_autonomy", label: "Felt in control of choices" },
    { key: "q_ease_of_decline", label: "Easy to decline options" },
  ],
  h2: [
    { key: "q_pressure", label: "Felt pressured" },
    { key: "q_transparency", label: "App was transparent" },
    { key: "q_trust", label: "Trust the app" },
    { key: "q_return_intent", label: "Would use again" },
  ],
};

const ALL_LIKERT = [
  { key: "q_autonomy", label: "Autonomy" },
  { key: "q_transparency", label: "Transparency" },
  { key: "q_pressure", label: "Pressure" },
  { key: "q_trust", label: "Trust" },
  { key: "q_return_intent", label: "Return Intent" },
  { key: "q_price_expectation", label: "Price Fairness" },
  { key: "q_ease_of_decline", label: "Ease of Decline" },
];

// ─── Stats helpers ───────────────────────────────────────────

function mean(nums: number[]) {
  return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0;
}

function sd(nums: number[]) {
  if (nums.length < 2) return 0;
  const m = mean(nums);
  return Math.sqrt(
    nums.reduce((s, n) => s + (n - m) ** 2, 0) / (nums.length - 1)
  );
}

function fmt(n: number, d = 2) {
  return n.toFixed(d);
}

// Clean up raw DB values for display (e.g. "few-times-week" → "Few Times a Week")
function prettify(s: string) {
  return s
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// Welch's t-test (independent samples, unequal variance)
function welchTTest(a: number[], b: number[]) {
  const n1 = a.length,
    n2 = b.length;
  if (n1 < 2 || n2 < 2) return { t: 0, df: 0, p: 1, significant: false };

  const m1 = mean(a),
    m2 = mean(b);
  const v1 = sd(a) ** 2,
    v2 = sd(b) ** 2;
  const se = Math.sqrt(v1 / n1 + v2 / n2);
  if (se === 0) return { t: 0, df: 0, p: 1, significant: false };

  const t = (m1 - m2) / se;

  // Welch-Satterthwaite degrees of freedom
  const df =
    (v1 / n1 + v2 / n2) ** 2 /
    ((v1 / n1) ** 2 / (n1 - 1) + (v2 / n2) ** 2 / (n2 - 1));

  // Approximate two-tailed p-value using the t-distribution
  // Using a simple approximation for |t| with df
  const p = tDistP(Math.abs(t), df);

  return { t, df, p, significant: p < 0.05 };
}

// Approximate two-tailed p-value for t-distribution
// Uses the regularized incomplete beta function approximation
function tDistP(t: number, df: number): number {
  const x = df / (df + t * t);
  // Approximation via regularized incomplete beta function
  // Using a series expansion that's good enough for our purposes
  const a = df / 2;
  const b = 0.5;
  let result = Math.exp(
    a * Math.log(x) +
      b * Math.log(1 - x) +
      lgamma(a + b) -
      lgamma(a) -
      lgamma(b)
  );

  let sum = 1;
  let term = 1;
  for (let i = 0; i < 200; i++) {
    term *= ((a + i) * x) / (a + b + i);
    // Regularized form
    const newTerm = term / (a + 1 + i);
    sum += newTerm;
    if (Math.abs(newTerm) < 1e-10) break;
  }
  result *= sum / a;
  // result is one-tailed; double for two-tailed test
  return Math.min(1, Math.max(0, 2 * result));
}

// Log-gamma function (Stirling approximation + Lanczos)
function lgamma(x: number): number {
  const c = [
    76.18009172947146, -86.50532032941677, 24.01409824083091,
    -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5,
  ];
  let y = x;
  let tmp = x + 5.5;
  tmp -= (x + 0.5) * Math.log(tmp);
  let ser = 1.000000000190015;
  for (let j = 0; j < 6; j++) {
    ser += c[j] / ++y;
  }
  return -tmp + Math.log((2.5066282746310005 * ser) / x);
}

// ─── Section component ──────────────────────────────────────

function Section({
  id,
  title,
  subtitle,
  children,
}: {
  id?: string;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="bg-white rounded-2xl border border-gray-200 p-5 sm:p-8">
      <h2 className="text-base sm:text-lg font-bold text-gray-900">{title}</h2>
      {subtitle && (
        <p className="text-xs sm:text-sm text-gray-500 mt-1">{subtitle}</p>
      )}
      <div className="mt-5">{children}</div>
    </section>
  );
}

function Badge({ sig }: { sig: boolean }) {
  return sig ? (
    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-700">
      Statistically significant
    </span>
  ) : (
    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
      Not significant
    </span>
  );
}

// Visual bar showing two scores on a 1-7 scale
function ComparisonBar({
  label,
  darkVal,
  ethicalVal,
  higher,
}: {
  label: string;
  darkVal: number;
  ethicalVal: number;
  higher: "dark" | "ethical" | "equal";
}) {
  const maxWidth = 7;
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700">{label}</span>
        {higher !== "equal" && (
          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
            higher === "dark" ? "bg-red-50 text-red-600" : "bg-green-50 text-green-600"
          }`}>
            {higher === "dark" ? "Dark higher" : "Ethical higher"} by {fmt(Math.abs(darkVal - ethicalVal), 1)}
          </span>
        )}
      </div>
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-gray-400 w-12 shrink-0">Dark</span>
          <div className="flex-1 bg-gray-100 rounded-full h-3 overflow-hidden">
            <div
              className="h-full bg-red-400 rounded-full transition-all"
              style={{ width: `${(darkVal / maxWidth) * 100}%` }}
            />
          </div>
          <span className="text-xs font-semibold text-gray-700 w-8 text-right">{fmt(darkVal, 1)}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-gray-400 w-12 shrink-0">Ethical</span>
          <div className="flex-1 bg-gray-100 rounded-full h-3 overflow-hidden">
            <div
              className="h-full bg-green-400 rounded-full transition-all"
              style={{ width: `${(ethicalVal / maxWidth) * 100}%` }}
            />
          </div>
          <span className="text-xs font-semibold text-gray-700 w-8 text-right">{fmt(ethicalVal, 1)}</span>
        </div>
      </div>
    </div>
  );
}

// Collapsible stats detail
function StatsDetail({
  tests,
}: {
  tests: {
    label: string;
    darkMean: number;
    darkSd: number;
    ethicalMean: number;
    ethicalSd: number;
    darkN: number;
    ethicalN: number;
    t: number;
    df: number;
    significant: boolean;
  }[];
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-3">
      <button
        onClick={() => setOpen(!open)}
        className="text-xs text-[#7B2D8E] font-medium cursor-pointer hover:underline"
      >
        {open ? "Hide" : "Show"} statistical details
      </button>
      {open && (
        <div className="mt-2 overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-gray-400 border-b">
                <th className="pb-1.5 pr-3">Measure</th>
                <th className="pb-1.5 pr-3">Dark (M ± SD)</th>
                <th className="pb-1.5 pr-3">Ethical (M ± SD)</th>
                <th className="pb-1.5 pr-3">t</th>
                <th className="pb-1.5 pr-3">df</th>
                <th className="pb-1.5">Sig.</th>
              </tr>
            </thead>
            <tbody>
              {tests.map((t) => (
                <tr key={t.label} className="border-b border-gray-50">
                  <td className="py-1.5 pr-3 text-gray-600">{t.label}</td>
                  <td className="py-1.5 pr-3 font-mono">{fmt(t.darkMean)} ± {fmt(t.darkSd)} (n={t.darkN})</td>
                  <td className="py-1.5 pr-3 font-mono">{fmt(t.ethicalMean)} ± {fmt(t.ethicalSd)} (n={t.ethicalN})</td>
                  <td className="py-1.5 pr-3 font-mono">{fmt(t.t)}</td>
                  <td className="py-1.5 pr-3 font-mono">{fmt(t.df, 1)}</td>
                  <td className="py-1.5"><Badge sig={t.significant} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────

export default function InsightsPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [
      { data: participants },
      { data: sessions },
      { data: checkouts },
      { data: surveys },
      { data: interactions },
    ] = await Promise.all([
      supabase.from("participants").select("*").order("created_at"),
      supabase.from("sessions").select("*"),
      supabase.from("checkout_data").select("*"),
      supabase.from("survey_responses").select("*"),
      supabase.from("interactions").select("*").order("created_at"),
    ]);

    const sMap = new Map<string, Session>();
    (sessions || []).forEach((s: Session) => sMap.set(s.participant_id, s));
    const cMap = new Map<string, CheckoutData>();
    (checkouts || []).forEach((c: CheckoutData) => cMap.set(c.session_id, c));
    const svMap = new Map<string, SurveyResponse>();
    (surveys || []).forEach((s: SurveyResponse) => svMap.set(s.session_id, s));
    const iMap = new Map<string, Interaction[]>();
    (interactions || []).forEach((i: Interaction) => {
      if (!iMap.has(i.session_id)) iMap.set(i.session_id, []);
      iMap.get(i.session_id)!.push(i);
    });

    const combined: Row[] = (participants || []).map((p: Participant) => {
      const session = sMap.get(p.id) || null;
      const sid = session?.id || "";
      const ints = iMap.get(sid) || [];
      const deviceEvent = ints.find((i) => i.event_type === "device_info");
      return {
        ...p,
        session,
        checkout: cMap.get(sid) || null,
        survey: svMap.get(sid) || null,
        interactions: ints,
        deviceInfo: deviceEvent?.metadata || null,
      };
    });

    setRows(combined);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ─── Computed insights ────────────────────────────────────

  const insights = useMemo(() => {
    const dark = rows.filter((r) => r.assigned_group === "dark_pattern");
    const ethical = rows.filter((r) => r.assigned_group === "ethical");
    const darkDone = dark.filter((r) => r.survey);
    const ethicalDone = ethical.filter((r) => r.survey);
    const allDone = [...darkDone, ...ethicalDone];

    // ── Demographics (completed responses only) ──
    const genders: Record<string, number> = {};
    const ages: Record<string, number> = {};
    const occupations: Record<string, number> = {};
    const usage: Record<string, number> = {};
    const devices: Record<string, number> = {};
    allDone.forEach((r) => {
      genders[r.gender] = (genders[r.gender] || 0) + 1;
      const ageLabel = r.age ? `${r.age}` : "unknown";
      ages[ageLabel] = (ages[ageLabel] || 0) + 1;
      occupations[r.occupation] = (occupations[r.occupation] || 0) + 1;
      usage[r.quick_commerce_usage] =
        (usage[r.quick_commerce_usage] || 0) + 1;
      const dt = (r.deviceInfo?.device_type as string) || "unknown";
      devices[dt] = (devices[dt] || 0) + 1;
    });

    const toPie = (obj: Record<string, number>) =>
      Object.entries(obj)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);

    // ── Hypothesis tests ──
    function getScores(group: Row[], key: string) {
      return group
        .map((r) => r.survey?.[key as keyof SurveyResponse] as number)
        .filter((n) => typeof n === "number");
    }

    // H1: Autonomy
    const h1Tests = HYPOTHESIS_QUESTIONS.h1.map((q) => {
      const dScores = getScores(darkDone, q.key);
      const eScores = getScores(ethicalDone, q.key);
      const test = welchTTest(dScores, eScores);
      return {
        label: q.label,
        darkMean: mean(dScores),
        darkSd: sd(dScores),
        ethicalMean: mean(eScores),
        ethicalSd: sd(eScores),
        darkN: dScores.length,
        ethicalN: eScores.length,
        ...test,
      };
    });

    // H2: Manipulation & Trust
    const h2Tests = HYPOTHESIS_QUESTIONS.h2.map((q) => {
      const dScores = getScores(darkDone, q.key);
      const eScores = getScores(ethicalDone, q.key);
      const test = welchTTest(dScores, eScores);
      return {
        label: q.label,
        darkMean: mean(dScores),
        darkSd: sd(dScores),
        ethicalMean: mean(eScores),
        ethicalSd: sd(eScores),
        darkN: dScores.length,
        ethicalN: eScores.length,
        ...test,
      };
    });

    // H3: Cart totals
    const darkTotals = darkDone
      .map((r) => r.checkout?.total_amount)
      .filter(Boolean) as number[];
    const ethicalTotals = ethicalDone
      .map((r) => r.checkout?.total_amount)
      .filter(Boolean) as number[];
    const h3Test = welchTTest(darkTotals, ethicalTotals);

    // ── Extra revenue (amount above base product cost + mandatory fees) ──
    const darkExtra = darkDone
      .map((r) => r.checkout?.extra_revenue)
      .filter((n): n is number => typeof n === "number");
    const ethicalExtra = ethicalDone
      .map((r) => r.checkout?.extra_revenue)
      .filter((n): n is number => typeof n === "number");

    // Sneaked item retention
    const darkSneakedKept = darkDone.filter(
      (r) => r.checkout?.sneaked_item_kept
    ).length;
    const darkWithCheckout = darkDone.filter((r) => r.checkout).length;

    // ── Promo stats ──
    const darkPromoApplied = darkDone.filter(
      (r) => r.checkout && r.checkout.promo_discount > 0
    ).length;
    const ethicalPromoApplied = ethicalDone.filter(
      (r) => r.checkout && r.checkout.promo_discount > 0
    ).length;
    const darkPromoAttempts = darkDone
      .map((r) => r.checkout?.promo_attempts ?? 0)
      .filter((n) => n > 0);
    const ethicalPromoAttempts = ethicalDone
      .map((r) => r.checkout?.promo_attempts ?? 0)
      .filter((n) => n > 0);

    // ── All likert comparison ──
    const likertComparison = ALL_LIKERT.map((q) => {
      const dScores = getScores(darkDone, q.key);
      const eScores = getScores(ethicalDone, q.key);
      return {
        question: q.label,
        "Dark Pattern": +mean(dScores).toFixed(2),
        Ethical: +mean(eScores).toFixed(2),
      };
    });

    // ── Behavioral evidence ──
    const behavioralRows = [
      {
        metric: "Chose express delivery",
        dark: darkDone.filter((r) => r.checkout?.delivery_option === "express")
          .length,
        darkTotal: darkDone.filter((r) => r.checkout).length,
        ethical: ethicalDone.filter(
          (r) => r.checkout?.delivery_option === "express"
        ).length,
        ethicalTotal: ethicalDone.filter((r) => r.checkout).length,
      },
      {
        metric: "Kept pre-selected tip",
        dark: darkDone.filter((r) => r.checkout && r.checkout.tip_amount > 0)
          .length,
        darkTotal: darkDone.filter((r) => r.checkout).length,
        ethical: ethicalDone.filter(
          (r) => r.checkout && r.checkout.tip_amount > 0
        ).length,
        ethicalTotal: ethicalDone.filter((r) => r.checkout).length,
      },
      {
        metric: "Donated to charity",
        dark: darkDone.filter(
          (r) => r.checkout && r.checkout.charity_amount > 0
        ).length,
        darkTotal: darkDone.filter((r) => r.checkout).length,
        ethical: ethicalDone.filter(
          (r) => r.checkout && r.checkout.charity_amount > 0
        ).length,
        ethicalTotal: ethicalDone.filter((r) => r.checkout).length,
      },
      {
        metric: "Accepted addons",
        dark: darkDone.filter(
          (r) => r.checkout && r.checkout.addons_accepted > 0
        ).length,
        darkTotal: darkDone.filter((r) => r.checkout).length,
        ethical: ethicalDone.filter(
          (r) => r.checkout && r.checkout.addons_accepted > 0
        ).length,
        ethicalTotal: ethicalDone.filter((r) => r.checkout).length,
      },
      {
        metric: "Kept sneaked item (auto-added curd)",
        dark: darkSneakedKept,
        darkTotal: darkWithCheckout,
        ethical: 0,
        ethicalTotal: ethicalDone.filter((r) => r.checkout).length,
      },
      {
        metric: "Successfully applied promo code",
        dark: darkPromoApplied,
        darkTotal: darkWithCheckout,
        ethical: ethicalPromoApplied,
        ethicalTotal: ethicalDone.filter((r) => r.checkout).length,
      },
    ];

    // ── Screen time comparison ──
    function getScreenTimes(group: Row[]) {
      const times: Record<string, number[]> = {};
      group.forEach((r) => {
        r.interactions
          .filter((i) => i.event_type === "screen_exit")
          .forEach((i) => {
            const s = i.screen || "unknown";
            const dur = (i.metadata?.duration_seconds as number) || 0;
            if (!times[s]) times[s] = [];
            times[s].push(dur);
          });
      });
      return times;
    }

    const darkTimes = getScreenTimes(darkDone);
    const ethicalTimes = getScreenTimes(ethicalDone);
    const allScreens = [
      ...new Set([...Object.keys(darkTimes), ...Object.keys(ethicalTimes)]),
    ].filter((s) => s !== "init" && s !== "unknown");

    const screenTimeData = allScreens.map((screen) => ({
      screen,
      "Dark Pattern": +(mean(darkTimes[screen] || []).toFixed(1)),
      Ethical: +(mean(ethicalTimes[screen] || []).toFixed(1)),
    }));

    // ── Open-ended themes ──
    const darkOpenEnded = darkDone
      .filter((r) => r.survey)
      .map((r) => ({
        unfair: r.survey!.q_unfair_experience,
        change: r.survey!.q_change_suggestion,
        comments: r.survey!.q_additional_comments,
      }));
    const ethicalOpenEnded = ethicalDone
      .filter((r) => r.survey)
      .map((r) => ({
        unfair: r.survey!.q_unfair_experience,
        change: r.survey!.q_change_suggestion,
        comments: r.survey!.q_additional_comments,
      }));

    return {
      total: rows.length,
      completed: allDone.length,
      darkN: dark.length,
      ethicalN: ethical.length,
      darkDoneN: darkDone.length,
      ethicalDoneN: ethicalDone.length,
      demographics: {
        genders: toPie(genders),
        occupations: toPie(occupations),
        usage: toPie(usage),
        devices: toPie(devices),
      },
      h1Tests,
      h2Tests,
      h3Test,
      darkCartMean: mean(darkTotals),
      darkCartSd: sd(darkTotals),
      ethicalCartMean: mean(ethicalTotals),
      ethicalCartSd: sd(ethicalTotals),
      darkCartN: darkTotals.length,
      ethicalCartN: ethicalTotals.length,
      darkExtraMean: mean(darkExtra),
      ethicalExtraMean: mean(ethicalExtra),
      darkSneakedKept,
      darkWithCheckout,
      darkPromoApplied,
      ethicalPromoApplied,
      darkPromoAttemptsMean: mean(darkPromoAttempts),
      ethicalPromoAttemptsMean: mean(ethicalPromoAttempts),
      likertComparison,
      behavioralRows,
      screenTimeData,
      darkOpenEnded,
      ethicalOpenEnded,
    };
  }, [rows]);

  // ─── Render ───────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-[#7B2D8E] border-t-transparent rounded-full mx-auto" />
          <p className="mt-3 text-sm text-gray-500">Loading insights...</p>
        </div>
      </div>
    );
  }

  const pct = (n: number, total: number) =>
    total ? `${Math.round((n / total) * 100)}%` : "—";

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero */}
      <div className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
          <p className="text-xs sm:text-sm text-[#7B2D8E] font-semibold uppercase tracking-wide">
            Research Findings
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mt-2">
            Dark Patterns in Quick Commerce Checkout Flows
          </h1>
          <p className="text-sm sm:text-base text-gray-600 mt-3 max-w-2xl leading-relaxed">
            A between-subjects experiment comparing dark pattern checkout
            interfaces against ethical design alternatives, measuring impact on
            user autonomy, perceived manipulation, trust, and revenue.
          </p>
          <div className="flex flex-wrap gap-4 mt-5 text-xs sm:text-sm text-gray-500">
            <span>
              <strong className="text-gray-700">Researcher:</strong> Arhaan
              Bahadur
            </span>
            <span>
              <strong className="text-gray-700">Institution:</strong> IIIT
              Delhi
            </span>
            <span>
              <strong className="text-gray-700">Course:</strong> Design
              Research &amp; Methodology
            </span>
          </div>
          <div className="flex flex-wrap gap-3 mt-5">
            <div className="bg-gray-100 rounded-lg px-3 py-2 text-center min-w-[80px]">
              <p className="text-xl sm:text-2xl font-bold text-gray-900">
                {insights.total}
              </p>
              <p className="text-[10px] text-gray-500 uppercase">
                Participants
              </p>
            </div>
            <div className="bg-red-50 rounded-lg px-3 py-2 text-center min-w-[80px]">
              <p className="text-xl sm:text-2xl font-bold text-red-700">
                {insights.darkN}
              </p>
              <p className="text-[10px] text-gray-500 uppercase">
                Dark Pattern
              </p>
            </div>
            <div className="bg-green-50 rounded-lg px-3 py-2 text-center min-w-[80px]">
              <p className="text-xl sm:text-2xl font-bold text-green-700">
                {insights.ethicalN}
              </p>
              <p className="text-[10px] text-gray-500 uppercase">Ethical</p>
            </div>
            <div className="bg-purple-50 rounded-lg px-3 py-2 text-center min-w-[80px]">
              <p className="text-xl sm:text-2xl font-bold text-[#7B2D8E]">
                {insights.completed}
              </p>
              <p className="text-[10px] text-gray-500 uppercase">Completed</p>
            </div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <div className="bg-white border-b sticky top-0 z-30">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 flex gap-4 overflow-x-auto text-xs sm:text-sm">
          {[
            { href: "#demographics", label: "Demographics" },
            { href: "#h1", label: "H1: Autonomy" },
            { href: "#h2", label: "H2: Manipulation" },
            { href: "#h3", label: "H3: Revenue" },
            { href: "#promo", label: "Promos" },
            { href: "#behavioral", label: "Behavioral" },
            { href: "#timing", label: "Timing" },
            { href: "#qualitative", label: "Qualitative" },
          ].map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="py-3 text-gray-500 hover:text-[#7B2D8E] whitespace-nowrap border-b-2 border-transparent hover:border-[#7B2D8E] transition-colors"
            >
              {link.label}
            </a>
          ))}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* ═══ DEMOGRAPHICS ═══ */}
        <Section
          id="demographics"
          title="Sample Demographics"
          subtitle={`N = ${insights.completed} completed responses (${insights.darkDoneN} dark pattern, ${insights.ethicalDoneN} ethical). ${insights.total} total started.`}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {[
              { title: "Gender", data: insights.demographics.genders },
              { title: "Occupation", data: insights.demographics.occupations },
              {
                title: "App Usage Frequency",
                data: insights.demographics.usage,
              },
              { title: "Device Type", data: insights.demographics.devices },
            ].map((chart) => {
              const total = chart.data.reduce((s, d) => s + d.value, 0);
              return (
                <div key={chart.title}>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">
                    {chart.title}
                  </h3>
                  <div className="h-44">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={chart.data}
                          cx="50%"
                          cy="50%"
                          innerRadius={30}
                          outerRadius={65}
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
                  {/* Legend */}
                  <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-2 justify-center">
                    {chart.data.map((d, i) => (
                      <div key={d.name} className="flex items-center gap-1.5 text-xs text-gray-600">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }}
                        />
                        <span>{prettify(d.name)}</span>
                        <span className="text-gray-400">
                          {total ? `${Math.round((d.value / total) * 100)}%` : ""}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </Section>

        {/* ═══ ALL LIKERT OVERVIEW ═══ */}
        <Section
          title="Survey Score Comparison"
          subtitle="Mean scores on 7-point Likert scale (1 = Strongly Disagree, 7 = Strongly Agree)"
        >
          <div className="h-72 sm:h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={insights.likertComparison}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis
                  dataKey="question"
                  tick={{ fontSize: 10 }}
                  angle={-20}
                  textAnchor="end"
                  height={50}
                />
                <YAxis domain={[1, 7]} allowDataOverflow tick={{ fontSize: 11 }} ticks={[1, 2, 3, 4, 5, 6, 7]} />
                <Tooltip contentStyle={{ fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <ReferenceLine y={4} stroke={COLORS.neutral} strokeDasharray="4 4" label={{ value: "Neutral", position: "right", fontSize: 10, fill: "#94a3b8" }} />
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
        </Section>

        {/* ═══ H1: AUTONOMY ═══ */}
        <Section
          id="h1"
          title="H1: Perceived Autonomy"
          subtitle="Do users of dark pattern checkouts feel less in control of their choices?"
        >
          {insights.h1Tests.length > 0 && insights.h1Tests[0].darkN > 0 ? (
            <>
              <div className="space-y-5">
                {insights.h1Tests.map((t) => (
                  <ComparisonBar
                    key={t.label}
                    label={t.label}
                    darkVal={t.darkMean}
                    ethicalVal={t.ethicalMean}
                    higher={
                      Math.abs(t.darkMean - t.ethicalMean) < 0.05
                        ? "equal"
                        : t.darkMean > t.ethicalMean
                        ? "dark"
                        : "ethical"
                    }
                  />
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-3">Scores on a 1-7 scale where 7 = strongly agree</p>
              {insights.h1Tests.some((t) => t.significant) ? (
                <div className="mt-4 text-sm bg-green-50 border border-green-200 rounded-xl p-4">
                  <p className="font-semibold text-green-800">H1 Supported</p>
                  <p className="text-green-700 mt-1">
                    Users in the dark pattern group reported significantly lower
                    feelings of control and autonomy during checkout.
                  </p>
                </div>
              ) : (
                <div className="mt-4 text-sm bg-amber-50 border border-amber-200 rounded-xl p-4">
                  <p className="font-semibold text-amber-800">Trend in expected direction</p>
                  <p className="text-amber-700 mt-1">
                    Dark pattern users scored lower on autonomy, but the difference
                    isn&apos;t statistically significant yet with the current sample
                    (n = {insights.h1Tests[0].darkN + insights.h1Tests[0].ethicalN}).
                  </p>
                </div>
              )}
              <StatsDetail tests={insights.h1Tests} />
            </>
          ) : (
            <p className="text-sm text-gray-400 bg-gray-50 rounded-lg p-4">
              Awaiting completed responses to run this analysis.
            </p>
          )}
        </Section>

        {/* ═══ H2: MANIPULATION & TRUST ═══ */}
        <Section
          id="h2"
          title="H2: Perceived Manipulation & Trust"
          subtitle="Do users of dark pattern checkouts feel more manipulated and less trusting?"
        >
          {insights.h2Tests.length > 0 && insights.h2Tests[0].darkN > 0 ? (
            <>
              <div className="space-y-5">
                {insights.h2Tests.map((t) => (
                  <ComparisonBar
                    key={t.label}
                    label={t.label}
                    darkVal={t.darkMean}
                    ethicalVal={t.ethicalMean}
                    higher={
                      Math.abs(t.darkMean - t.ethicalMean) < 0.05
                        ? "equal"
                        : t.darkMean > t.ethicalMean
                        ? "dark"
                        : "ethical"
                    }
                  />
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-3">Scores on a 1-7 scale where 7 = strongly agree</p>
              {insights.h2Tests.some((t) => t.significant) ? (
                <div className="mt-4 text-sm bg-green-50 border border-green-200 rounded-xl p-4">
                  <p className="font-semibold text-green-800">H2 Supported</p>
                  <p className="text-green-700 mt-1">
                    Significant differences found — dark pattern users reported feeling
                    more pressured and/or less trusting of the app.
                  </p>
                </div>
              ) : (
                <div className="mt-4 text-sm bg-amber-50 border border-amber-200 rounded-xl p-4">
                  <p className="font-semibold text-amber-800">Trend in expected direction</p>
                  <p className="text-amber-700 mt-1">
                    Dark pattern users scored higher on pressure and lower on trust,
                    but differences aren&apos;t statistically significant with the current sample.
                  </p>
                </div>
              )}
              <StatsDetail tests={insights.h2Tests} />
            </>
          ) : (
            <p className="text-sm text-gray-400 bg-gray-50 rounded-lg p-4">
              Awaiting completed responses to run this analysis.
            </p>
          )}
        </Section>

        {/* ═══ H3: REVENUE / CART TOTAL ═══ */}
        <Section
          id="h3"
          title="H3: Revenue Impact"
          subtitle="Do dark pattern checkouts generate higher order values?"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={[
                    {
                      group: "Dark Pattern",
                      total: +insights.darkCartMean.toFixed(0),
                    },
                    {
                      group: "Ethical",
                      total: +insights.ethicalCartMean.toFixed(0),
                    },
                  ]}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
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
            <div className="space-y-3">
              <div className="bg-red-50 rounded-xl p-4">
                <p className="text-xs text-gray-500">Dark Pattern Group</p>
                <p className="text-2xl font-bold text-red-700">
                  ₹{fmt(insights.darkCartMean, 0)}
                </p>
                <p className="text-xs text-gray-400">
                  average order value ({insights.darkCartN} orders)
                </p>
              </div>
              <div className="bg-green-50 rounded-xl p-4">
                <p className="text-xs text-gray-500">Ethical Group</p>
                <p className="text-2xl font-bold text-green-700">
                  ₹{fmt(insights.ethicalCartMean, 0)}
                </p>
                <p className="text-xs text-gray-400">
                  average order value ({insights.ethicalCartN} orders)
                </p>
              </div>
              {insights.darkCartN > 0 && (
                <div className={`rounded-xl p-4 text-sm border ${
                  insights.h3Test.significant
                    ? "bg-green-50 border-green-200"
                    : "bg-amber-50 border-amber-200"
                }`}>
                  <p className={`font-semibold ${
                    insights.h3Test.significant ? "text-green-800" : "text-amber-800"
                  }`}>
                    {insights.darkCartMean > insights.ethicalCartMean
                      ? `Dark pattern orders are ₹${fmt(Math.abs(insights.darkCartMean - insights.ethicalCartMean), 0)} higher`
                      : `Ethical orders are ₹${fmt(Math.abs(insights.darkCartMean - insights.ethicalCartMean), 0)} higher`}
                  </p>
                  <p className={`text-xs mt-1 ${
                    insights.h3Test.significant ? "text-green-600" : "text-amber-600"
                  }`}>
                    This is due to sneaked items, pre-selected tips, express delivery, and surge fees
                    in the dark pattern version. <Badge sig={insights.h3Test.significant} />
                  </p>
                </div>
              )}
            </div>
          </div>
        </Section>

        {/* ═══ EXTRA REVENUE BREAKDOWN ═══ */}
        <Section
          title="Revenue Breakdown: Where the Extra Money Comes From"
          subtitle="Non-product charges per order: delivery fee + surge fee + tip + charity + sneaked item cost - promo discount"
        >
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-red-50 rounded-xl p-5 text-center">
              <p className="text-xs text-gray-500">Dark Pattern Extra</p>
              <p className="text-3xl font-bold text-red-700">
                ₹{fmt(insights.darkExtraMean, 0)}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                avg non-product charges per order
              </p>
            </div>
            <div className="bg-green-50 rounded-xl p-5 text-center">
              <p className="text-xs text-gray-500">Ethical Extra</p>
              <p className="text-3xl font-bold text-green-700">
                ₹{fmt(insights.ethicalExtraMean, 0)}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                avg non-product charges per order
              </p>
            </div>
            <div className="bg-purple-50 rounded-xl p-5 text-center">
              <p className="text-xs text-gray-500">Dark Pattern Uplift</p>
              <p className="text-3xl font-bold text-[#7B2D8E]">
                ₹{fmt(Math.abs(insights.darkExtraMean - insights.ethicalExtraMean), 0)}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                extra per order from manipulation
              </p>
            </div>
          </div>
          <div className="mt-4 text-sm text-gray-600 bg-gray-50 rounded-xl p-4 space-y-1">
            <p className="font-medium text-gray-700">Where the extra charges come from (dark pattern only):</p>
            <ul className="list-disc list-inside text-xs text-gray-500 space-y-0.5">
              <li>Sneaked item (Amul Dahi): ₹35 — kept by {insights.darkWithCheckout > 0 ? `${Math.round((insights.darkSneakedKept / insights.darkWithCheckout) * 100)}%` : "—"} of dark pattern users</li>
              <li>Pre-selected express delivery: ₹35</li>
              <li>Pre-selected tip: ₹30</li>
              <li>Hidden surge fee: ₹10</li>
              <li>Pre-checked charity: ₹2</li>
              <li className="font-medium text-gray-600">Maximum possible dark pattern uplift: ₹112 per order</li>
            </ul>
          </div>
        </Section>

        {/* ═══ PROMO CODE ANALYSIS ═══ */}
        <Section
          id="promo"
          title="Promo Code Usability"
          subtitle="Dark pattern shows confusing/misleading promos; ethical shows clear, valid codes"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-red-50 rounded-xl p-4">
              <p className="text-xs text-gray-500">Dark Pattern Group</p>
              <p className="text-lg font-bold text-red-700">
                {insights.darkWithCheckout > 0
                  ? `${Math.round((insights.darkPromoApplied / insights.darkWithCheckout) * 100)}%`
                  : "—"}{" "}
                <span className="text-sm font-normal text-gray-500">applied a promo</span>
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Avg {fmt(insights.darkPromoAttemptsMean, 1)} attempts per user who tried
              </p>
              <p className="text-xs text-gray-400">
                3 of 4 codes are misleading (expired or unreachable min order)
              </p>
            </div>
            <div className="bg-green-50 rounded-xl p-4">
              <p className="text-xs text-gray-500">Ethical Group</p>
              <p className="text-lg font-bold text-green-700">
                {insights.ethicalDoneN > 0
                  ? `${Math.round((insights.ethicalPromoApplied / insights.ethicalDoneN) * 100)}%`
                  : "—"}{" "}
                <span className="text-sm font-normal text-gray-500">applied a promo</span>
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Avg {fmt(insights.ethicalPromoAttemptsMean, 1)} attempts per user who tried
              </p>
              <p className="text-xs text-gray-400">
                All available codes are valid and clearly labeled
              </p>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-3 bg-gray-50 rounded-lg p-3">
            Higher attempt counts in the dark pattern group suggest users tried multiple misleading codes
            before finding a valid one (or gave up). This measures the friction introduced by deceptive promo design.
          </p>
        </Section>

        {/* ═══ BEHAVIORAL EVIDENCE ═══ */}
        <Section
          id="behavioral"
          title="What Users Actually Did"
          subtitle="Percentage of participants who kept pre-selected options or accepted suggestions"
        >
          <div className="space-y-4">
            {insights.behavioralRows.map((row) => {
              const darkPct = row.darkTotal ? Math.round((row.dark / row.darkTotal) * 100) : 0;
              const ethicalPct = row.ethicalTotal ? Math.round((row.ethical / row.ethicalTotal) * 100) : 0;
              return (
                <div key={row.metric} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">{row.metric}</span>
                    {Math.abs(darkPct - ethicalPct) >= 10 && (
                      <span className="text-[10px] font-medium text-gray-500">
                        {Math.abs(darkPct - ethicalPct)}pp difference
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-100 rounded-full h-5 overflow-hidden">
                        <div
                          className="h-full bg-red-400 rounded-full transition-all flex items-center justify-end pr-2"
                          style={{ width: `${Math.max(darkPct, 5)}%` }}
                        >
                          {darkPct >= 20 && (
                            <span className="text-[10px] font-bold text-white">{darkPct}%</span>
                          )}
                        </div>
                      </div>
                      {darkPct < 20 && (
                        <span className="text-xs font-semibold text-red-700">{darkPct}%</span>
                      )}
                      <span className="text-[10px] text-gray-400">Dark</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-100 rounded-full h-5 overflow-hidden">
                        <div
                          className="h-full bg-green-400 rounded-full transition-all flex items-center justify-end pr-2"
                          style={{ width: `${Math.max(ethicalPct, 5)}%` }}
                        >
                          {ethicalPct >= 20 && (
                            <span className="text-[10px] font-bold text-white">{ethicalPct}%</span>
                          )}
                        </div>
                      </div>
                      {ethicalPct < 20 && (
                        <span className="text-xs font-semibold text-green-700">{ethicalPct}%</span>
                      )}
                      <span className="text-[10px] text-gray-400">Ethical</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <p className="text-xs text-gray-400 mt-4">
            In the dark pattern version, express delivery, tip, and charity were pre-selected.
            In the ethical version, these were opt-in with equal-weight choices.
          </p>
        </Section>

        {/* ═══ SCREEN TIMING ═══ */}
        <Section
          id="timing"
          title="Time Spent per Screen"
          subtitle="How long users spent on each step — longer checkout time may indicate confusion or hesitation"
        >
          {insights.screenTimeData.length > 0 ? (
            <>
              <div className="h-64 sm:h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={insights.screenTimeData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="screen" tick={{ fontSize: 11 }} />
                    <YAxis
                      tick={{ fontSize: 11 }}
                      label={{
                        value: "seconds",
                        angle: -90,
                        position: "insideLeft",
                        fontSize: 10,
                        fill: "#94a3b8",
                      }}
                    />
                    <Tooltip contentStyle={{ fontSize: 12 }} />
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
              <p className="text-xs text-gray-400 mt-2">
                Dark pattern users may spend more time on checkout due to reviewing unexpected fees,
                or less time if urgency timers rushed them through.
              </p>
            </>
          ) : (
            <p className="text-sm text-gray-400">
              No screen timing data collected yet.
            </p>
          )}
        </Section>

        {/* ═══ QUALITATIVE ═══ */}
        <Section
          id="qualitative"
          title="Qualitative Responses"
          subtitle="Open-ended responses grouped by experiment condition"
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Dark pattern responses */}
            <div>
              <h3 className="text-sm font-semibold text-red-700 mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-500" />
                Dark Pattern Group
              </h3>
              {insights.darkOpenEnded.length > 0 ? (
                <div className="space-y-4">
                  {insights.darkOpenEnded.map((r, i) => (
                    <div
                      key={i}
                      className="bg-red-50/50 rounded-xl p-4 space-y-2 text-sm border border-red-100"
                    >
                      {r.unfair && (
                        <div>
                          <p className="text-[10px] text-gray-500 uppercase mb-0.5">
                            What felt unfair
                          </p>
                          <p className="text-gray-800">{r.unfair}</p>
                        </div>
                      )}
                      {r.change && (
                        <div>
                          <p className="text-[10px] text-gray-500 uppercase mb-0.5">
                            What they would change
                          </p>
                          <p className="text-gray-800">{r.change}</p>
                        </div>
                      )}
                      {r.comments && (
                        <div>
                          <p className="text-[10px] text-gray-500 uppercase mb-0.5">
                            Additional
                          </p>
                          <p className="text-gray-800">{r.comments}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400">No responses yet.</p>
              )}
            </div>

            {/* Ethical responses */}
            <div>
              <h3 className="text-sm font-semibold text-green-700 mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500" />
                Ethical Group
              </h3>
              {insights.ethicalOpenEnded.length > 0 ? (
                <div className="space-y-4">
                  {insights.ethicalOpenEnded.map((r, i) => (
                    <div
                      key={i}
                      className="bg-green-50/50 rounded-xl p-4 space-y-2 text-sm border border-green-100"
                    >
                      {r.unfair && (
                        <div>
                          <p className="text-[10px] text-gray-500 uppercase mb-0.5">
                            What felt unfair
                          </p>
                          <p className="text-gray-800">{r.unfair}</p>
                        </div>
                      )}
                      {r.change && (
                        <div>
                          <p className="text-[10px] text-gray-500 uppercase mb-0.5">
                            What they would change
                          </p>
                          <p className="text-gray-800">{r.change}</p>
                        </div>
                      )}
                      {r.comments && (
                        <div>
                          <p className="text-[10px] text-gray-500 uppercase mb-0.5">
                            Additional
                          </p>
                          <p className="text-gray-800">{r.comments}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400">No responses yet.</p>
              )}
            </div>
          </div>
        </Section>

        {/* ═══ METHODOLOGY NOTE ═══ */}
        <Section title="Methodology">
          <div className="prose prose-sm max-w-none text-gray-600 space-y-3">
            <p>
              <strong>Design:</strong> Between-subjects experiment with random
              assignment (alternating for balance). Participants were randomly
              assigned to either a dark pattern checkout prototype (control) or
              an ethical design alternative (treatment).
            </p>
            <p>
              <strong>Prototype:</strong> A simulated quick commerce checkout
              flow modeled after apps like Zepto and Blinkit. Both groups
              received the same base cart (8 grocery items). The dark pattern
              version included sneaked items, pre-selected tips, hidden fees,
              urgency timers, and confirmshaming. The ethical version showed all
              costs upfront with equal-weight opt-in choices.
            </p>
            <p>
              <strong>Measures:</strong> 7 Likert-scale items (1-7) measuring
              perceived autonomy, transparency, pressure, trust, return intent,
              price fairness, and ease of declining. 3 open-ended questions. Cart
              total and behavioral metrics tracked automatically.
            </p>
            <p>
              <strong>Analysis:</strong> Independent-samples Welch&apos;s t-tests
              for each dependent variable. Behavioral evidence presented as
              proportions. Qualitative responses grouped by condition for
              thematic comparison.
            </p>
          </div>
        </Section>

        {/* Footer */}
        <div className="text-center py-8 text-xs text-gray-400">
          <p>
            Arhaan Bahadur &middot; IIIT Delhi &middot; Design Research &amp; Methodology &middot;
            2026
          </p>
        </div>
      </div>
    </div>
  );
}
