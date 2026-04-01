"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/lib/supabase";
import { useExperimentStore, AssignedGroup } from "@/lib/store";
import {
  trackDeviceInfo,
  trackScreenEntry,
  trackEvent,
} from "@/lib/tracking";
import { toast } from "sonner";

const AGE_RANGES = [
  "16-18",
  "19-22",
  "23-25",
  "26-30",
  "31-40",
  "41-50",
  "50+",
];

const GENDERS = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "non-binary", label: "Non-binary" },
  { value: "prefer-not-to-say", label: "Prefer not to say" },
];

const OCCUPATIONS = [
  { value: "student", label: "Student" },
  { value: "working-professional", label: "Working Professional" },
  { value: "freelancer", label: "Freelancer / Self-employed" },
  { value: "homemaker", label: "Homemaker" },
  { value: "unemployed", label: "Not currently employed" },
  { value: "other", label: "Other" },
];

const SPENDING_RANGES = [
  { value: "under-500", label: "Under ₹500" },
  { value: "500-1000", label: "₹500 – ₹1,000" },
  { value: "1000-2000", label: "₹1,000 – ₹2,000" },
  { value: "2000-5000", label: "₹2,000 – ₹5,000" },
  { value: "above-5000", label: "Above ₹5,000" },
];

const USAGE_FREQUENCIES = [
  { value: "daily", label: "Daily" },
  { value: "few-times-week", label: "A few times a week" },
  { value: "weekly", label: "About once a week" },
  { value: "few-times-month", label: "A few times a month" },
  { value: "rarely", label: "Rarely" },
  { value: "never", label: "Never" },
];

function lookup(
  arr: readonly { value: string; label: string }[],
  val: string
) {
  return arr.find((a) => a.value === val)?.label ?? "";
}

export function DemographicsForm() {
  const { initExperiment, setStep } = useExperimentStore();

  const [form, setForm] = useState({
    name: "",
    email: "",
    ageRange: "",
    gender: "",
    occupation: "",
    occupationOther: "",
    monthlySpending: "",
    quickCommerceUsage: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const formRef = useRef<HTMLFormElement>(null);
  const [demoEnteredAt] = useState(Date.now());

  const occupation =
    form.occupation === "other" ? form.occupationOther : form.occupation;

  const isValid =
    form.name.trim() &&
    form.email.trim() &&
    form.ageRange &&
    form.gender &&
    (form.occupation !== "other"
      ? form.occupation
      : form.occupationOther.trim()) &&
    form.monthlySpending &&
    form.quickCommerceUsage;

  function getFirstMissingField(): string | null {
    if (!form.name.trim()) return "name";
    if (!form.email.trim()) return "email";
    if (!form.ageRange) return "age-range";
    if (!form.gender) return "gender";
    if (!form.occupation) return "occupation";
    if (form.occupation === "other" && !form.occupationOther.trim())
      return "occupation-other";
    if (!form.monthlySpending) return "spending";
    if (!form.quickCommerceUsage) return "usage";
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid) {
      const missing = getFirstMissingField();
      toast.error("Please fill in all required fields.");
      if (missing) {
        document.getElementById(missing)?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
        document.getElementById(missing)?.focus();
      }
      return;
    }
    setLoading(true);
    setError("");

    try {
      // Alternate group based on last completed session's group
      // This ensures balanced groups even if some participants drop out
      const { data: lastCompleted } = await supabase
        .from("sessions")
        .select("assigned_group")
        .not("completed_at", "is", null)
        .order("completed_at", { ascending: false })
        .limit(1)
        .single();

      const group: AssignedGroup =
        lastCompleted?.assigned_group === "dark_pattern"
          ? "ethical"
          : "dark_pattern";

      // Parse age from range (use midpoint for storage)
      const ageMid: Record<string, number> = {
        "16-18": 17,
        "19-22": 20,
        "23-25": 24,
        "26-30": 28,
        "31-40": 35,
        "41-50": 45,
        "50+": 55,
      };

      // Save participant
      const { data: participant, error: pError } = await supabase
        .from("participants")
        .insert({
          name: form.name.trim(),
          email: form.email.trim(),
          age: ageMid[form.ageRange] || null,
          gender: form.gender,
          occupation,
          monthly_spending_range: form.monthlySpending,
          quick_commerce_usage: form.quickCommerceUsage,
          assigned_group: group,
        })
        .select()
        .single();

      if (pError) throw pError;

      // Create session
      const { data: session, error: sError } = await supabase
        .from("sessions")
        .insert({
          participant_id: participant.id,
          assigned_group: group,
        })
        .select()
        .single();

      if (sError) throw sError;

      // Initialize store with participant + session + group
      initExperiment(participant.id, session.id, group);

      // Track device / browser info for this session
      trackDeviceInfo(session.id);

      // Retroactively track pre-session screen times (consent + demographics)
      const consentDur = parseFloat(
        localStorage.getItem("drm_consent_duration") || "0"
      );
      if (consentDur > 0) {
        trackScreenEntry(session.id, "consent");
        trackEvent({
          session_id: session.id,
          event_type: "screen_exit",
          screen: "consent",
          metadata: { duration_seconds: consentDur },
        });
      }
      trackScreenEntry(session.id, "demographics");
      trackEvent({
        session_id: session.id,
        event_type: "screen_exit",
        screen: "demographics",
        metadata: {
          duration_seconds: (Date.now() - demoEnteredAt) / 1000,
        },
      });
    } catch (err) {
      console.error(err);
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-lg mx-auto p-4 py-8">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">About You</CardTitle>
          <p className="text-xs text-gray-500">
            All fields are required.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                placeholder="Enter your name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
            </div>

            <div id="age-range" className="space-y-2">
              <Label>Age Range</Label>
              <Select
                value={form.ageRange}
                onValueChange={(v) => v && setForm({ ...form, ageRange: v })}
              >
                <SelectTrigger className="cursor-pointer">
                  <span className={`text-sm truncate ${!form.ageRange ? "text-muted-foreground" : ""}`}>
                    {form.ageRange || "Select age range"}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  {AGE_RANGES.map((range) => (
                    <SelectItem key={range} value={range}>
                      {range}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div id="gender" className="space-y-2">
              <Label>Gender</Label>
              <Select
                value={form.gender}
                onValueChange={(v) => v && setForm({ ...form, gender: v })}
              >
                <SelectTrigger className="cursor-pointer">
                  <span className={`text-sm truncate ${!form.gender ? "text-muted-foreground" : ""}`}>
                    {lookup(GENDERS, form.gender) || "Select gender"}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  {GENDERS.map((g) => (
                    <SelectItem key={g.value} value={g.value}>
                      {g.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div id="occupation" className="space-y-2">
              <Label>Occupation</Label>
              <Select
                value={form.occupation}
                onValueChange={(v) => v && setForm({ ...form, occupation: v })}
              >
                <SelectTrigger className="cursor-pointer">
                  <span className={`text-sm truncate ${!form.occupation ? "text-muted-foreground" : ""}`}>
                    {lookup(OCCUPATIONS, form.occupation) || "Select occupation"}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  {OCCUPATIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.occupation === "other" && (
                <Input
                  id="occupation-other"
                  placeholder="Please specify your occupation"
                  value={form.occupationOther}
                  onChange={(e) =>
                    setForm({ ...form, occupationOther: e.target.value })
                  }
                  className="mt-2"
                />
              )}
            </div>

            <div id="spending" className="space-y-2">
              <Label>Monthly spending on quick commerce apps</Label>
              <Select
                value={form.monthlySpending}
                onValueChange={(v) =>
                  v && setForm({ ...form, monthlySpending: v })
                }
              >
                <SelectTrigger className="cursor-pointer">
                  <span className={`text-sm truncate ${!form.monthlySpending ? "text-muted-foreground" : ""}`}>
                    {lookup(SPENDING_RANGES, form.monthlySpending) || "Select range"}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  {SPENDING_RANGES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div id="usage" className="space-y-2">
              <Label>
                How often do you use Zepto, Blinkit, or similar apps?
              </Label>
              <Select
                value={form.quickCommerceUsage}
                onValueChange={(v) =>
                  v && setForm({ ...form, quickCommerceUsage: v })
                }
              >
                <SelectTrigger className="cursor-pointer">
                  <span className={`text-sm truncate ${!form.quickCommerceUsage ? "text-muted-foreground" : ""}`}>
                    {lookup(USAGE_FREQUENCIES, form.quickCommerceUsage) || "Select frequency"}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  {USAGE_FREQUENCIES.map((u) => (
                    <SelectItem key={u.value} value={u.value}>
                      {u.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 p-2 rounded">
                {error}
              </p>
            )}

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="cursor-pointer"
                onClick={() => setStep("consent")}
              >
                ← Back
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-[#7B2D8E] hover:bg-[#6A2579] text-white cursor-pointer"
                disabled={loading}
              >
                {loading ? "Setting up..." : "Continue →"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
