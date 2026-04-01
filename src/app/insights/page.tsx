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
  return Math.min(1, Math.max(0, result)); // This is one-tailed → double for two-tailed
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
      p &lt; 0.05
    </span>
  ) : (
    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
      not significant
    </span>
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

    // ── Demographics ──
    const genders: Record<string, number> = {};
    const ages: Record<string, number> = {};
    const occupations: Record<string, number> = {};
    const usage: Record<string, number> = {};
    const devices: Record<string, number> = {};
    rows.forEach((r) => {
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
          subtitle={`N = ${insights.total} participants (${insights.darkN} dark pattern, ${insights.ethicalN} ethical)`}
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
            ].map((chart) => (
              <div key={chart.title}>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">
                  {chart.title}
                </h3>
                <div className="h-52">
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
                        label={({ name, percent }) =>
                          `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
                        }
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
              </div>
            ))}
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
                <YAxis domain={[1, 7]} tick={{ fontSize: 11 }} />
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
          subtitle="Dark pattern checkout flows lead to lower perceived autonomy compared to ethical design alternatives."
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500 border-b">
                  <th className="pb-2 pr-4">Measure</th>
                  <th className="pb-2 pr-4">Dark (M ± SD)</th>
                  <th className="pb-2 pr-4">Ethical (M ± SD)</th>
                  <th className="pb-2 pr-4">t</th>
                  <th className="pb-2 pr-4">df</th>
                  <th className="pb-2">Result</th>
                </tr>
              </thead>
              <tbody>
                {insights.h1Tests.map((t) => (
                  <tr key={t.label} className="border-b border-gray-100">
                    <td className="py-2.5 pr-4 text-gray-700">{t.label}</td>
                    <td className="py-2.5 pr-4 font-mono text-xs">
                      {fmt(t.darkMean)} ± {fmt(t.darkSd)}{" "}
                      <span className="text-gray-400">(n={t.darkN})</span>
                    </td>
                    <td className="py-2.5 pr-4 font-mono text-xs">
                      {fmt(t.ethicalMean)} ± {fmt(t.ethicalSd)}{" "}
                      <span className="text-gray-400">(n={t.ethicalN})</span>
                    </td>
                    <td className="py-2.5 pr-4 font-mono text-xs">
                      {fmt(t.t)}
                    </td>
                    <td className="py-2.5 pr-4 font-mono text-xs">
                      {fmt(t.df, 1)}
                    </td>
                    <td className="py-2.5">
                      <Badge sig={t.significant} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {insights.h1Tests.some((t) => t.significant) ? (
            <p className="mt-4 text-sm text-green-700 bg-green-50 rounded-lg p-3">
              H1 supported — participants in the dark pattern group reported
              significantly lower autonomy scores.
            </p>
          ) : insights.h1Tests.length > 0 && insights.h1Tests[0].darkN > 0 ? (
            <p className="mt-4 text-sm text-gray-600 bg-gray-50 rounded-lg p-3">
              Results show a trend in the expected direction. Statistical
              significance may improve with a larger sample (current n ={" "}
              {insights.h1Tests[0].darkN + insights.h1Tests[0].ethicalN}).
            </p>
          ) : (
            <p className="mt-4 text-sm text-gray-400 bg-gray-50 rounded-lg p-3">
              Awaiting completed responses to run analysis.
            </p>
          )}
        </Section>

        {/* ═══ H2: MANIPULATION & TRUST ═══ */}
        <Section
          id="h2"
          title="H2: Perceived Manipulation & Trust"
          subtitle="Manipulative design leads to higher perceived manipulation, lower trust, and lower willingness to return."
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500 border-b">
                  <th className="pb-2 pr-4">Measure</th>
                  <th className="pb-2 pr-4">Dark (M ± SD)</th>
                  <th className="pb-2 pr-4">Ethical (M ± SD)</th>
                  <th className="pb-2 pr-4">t</th>
                  <th className="pb-2 pr-4">df</th>
                  <th className="pb-2">Result</th>
                </tr>
              </thead>
              <tbody>
                {insights.h2Tests.map((t) => (
                  <tr key={t.label} className="border-b border-gray-100">
                    <td className="py-2.5 pr-4 text-gray-700">{t.label}</td>
                    <td className="py-2.5 pr-4 font-mono text-xs">
                      {fmt(t.darkMean)} ± {fmt(t.darkSd)}{" "}
                      <span className="text-gray-400">(n={t.darkN})</span>
                    </td>
                    <td className="py-2.5 pr-4 font-mono text-xs">
                      {fmt(t.ethicalMean)} ± {fmt(t.ethicalSd)}{" "}
                      <span className="text-gray-400">(n={t.ethicalN})</span>
                    </td>
                    <td className="py-2.5 pr-4 font-mono text-xs">
                      {fmt(t.t)}
                    </td>
                    <td className="py-2.5 pr-4 font-mono text-xs">
                      {fmt(t.df, 1)}
                    </td>
                    <td className="py-2.5">
                      <Badge sig={t.significant} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {insights.h2Tests.some((t) => t.significant) ? (
            <p className="mt-4 text-sm text-green-700 bg-green-50 rounded-lg p-3">
              H2 supported — significant differences found in perceived
              manipulation and/or trust between groups.
            </p>
          ) : insights.h2Tests.length > 0 && insights.h2Tests[0].darkN > 0 ? (
            <p className="mt-4 text-sm text-gray-600 bg-gray-50 rounded-lg p-3">
              Results show trends in the expected direction. Statistical
              significance may improve with a larger sample.
            </p>
          ) : (
            <p className="mt-4 text-sm text-gray-400 bg-gray-50 rounded-lg p-3">
              Awaiting completed responses to run analysis.
            </p>
          )}
        </Section>

        {/* ═══ H3: REVENUE / CART TOTAL ═══ */}
        <Section
          id="h3"
          title="H3: Revenue Impact (Cart Total)"
          subtitle="Dark pattern checkout flows generate higher short-term revenue than ethical alternatives."
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
                <p className="text-xs text-gray-500">
                  SD = ₹{fmt(insights.darkCartSd, 0)}, n ={" "}
                  {insights.darkCartN}
                </p>
              </div>
              <div className="bg-green-50 rounded-xl p-4">
                <p className="text-xs text-gray-500">Ethical Group</p>
                <p className="text-2xl font-bold text-green-700">
                  ₹{fmt(insights.ethicalCartMean, 0)}
                </p>
                <p className="text-xs text-gray-500">
                  SD = ₹{fmt(insights.ethicalCartSd, 0)}, n ={" "}
                  {insights.ethicalCartN}
                </p>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 text-sm">
                <p>
                  <span className="font-mono text-xs">
                    t({fmt(insights.h3Test.df, 1)}) = {fmt(insights.h3Test.t)}
                  </span>{" "}
                  <Badge sig={insights.h3Test.significant} />
                </p>
                {insights.darkCartN > 0 && (
                  <p className="text-xs text-gray-500 mt-1">
                    Difference: ₹
                    {fmt(
                      Math.abs(
                        insights.darkCartMean - insights.ethicalCartMean
                      ),
                      0
                    )}{" "}
                    (
                    {insights.darkCartMean > insights.ethicalCartMean
                      ? "dark higher"
                      : "ethical higher"}
                    )
                  </p>
                )}
              </div>
            </div>
          </div>
        </Section>

        {/* ═══ BEHAVIORAL EVIDENCE ═══ */}
        <Section
          id="behavioral"
          title="Behavioral Evidence"
          subtitle="Concrete actions taken during the checkout prototype"
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500 border-b">
                  <th className="pb-2 pr-4">Behavior</th>
                  <th className="pb-2 pr-4">Dark Pattern</th>
                  <th className="pb-2">Ethical</th>
                </tr>
              </thead>
              <tbody>
                {insights.behavioralRows.map((row) => (
                  <tr
                    key={row.metric}
                    className="border-b border-gray-100"
                  >
                    <td className="py-2.5 pr-4 text-gray-700">
                      {row.metric}
                    </td>
                    <td className="py-2.5 pr-4">
                      <span className="font-semibold text-red-700">
                        {pct(row.dark, row.darkTotal)}
                      </span>{" "}
                      <span className="text-xs text-gray-400">
                        ({row.dark}/{row.darkTotal})
                      </span>
                    </td>
                    <td className="py-2.5">
                      <span className="font-semibold text-green-700">
                        {pct(row.ethical, row.ethicalTotal)}
                      </span>{" "}
                      <span className="text-xs text-gray-400">
                        ({row.ethical}/{row.ethicalTotal})
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        {/* ═══ SCREEN TIMING ═══ */}
        <Section
          id="timing"
          title="Time Spent per Screen"
          subtitle="Average seconds spent on each screen of the prototype"
        >
          {insights.screenTimeData.length > 0 ? (
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
            Arhaan Bahadur — IIIT Delhi — Design Research &amp; Methodology —
            2025
          </p>
        </div>
      </div>
    </div>
  );
}
