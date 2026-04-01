"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/lib/supabase";
import { useExperimentStore } from "@/lib/store";
import { trackScreenEntry, trackTap } from "@/lib/tracking";

const LIKERT_LABELS = [
  "Strongly Disagree",
  "Disagree",
  "Somewhat Disagree",
  "Neutral",
  "Somewhat Agree",
  "Agree",
  "Strongly Agree",
];

const LIKERT_QUESTIONS = [
  {
    key: "q_autonomy",
    text: "I felt in control of my choices while using this app.",
  },
  {
    key: "q_transparency",
    text: "The app was transparent about all costs and fees.",
  },
  {
    key: "q_pressure",
    text: "I felt pressured to add items or services I didn't initially want.",
  },
  {
    key: "q_trust",
    text: "I trust this app to act in my best interest.",
  },
  {
    key: "q_return_intent",
    text: "I would use this app again for future purchases.",
  },
  {
    key: "q_price_expectation",
    text: "The final price matched what I expected when I started checkout.",
  },
  {
    key: "q_ease_of_decline",
    text: "I found it easy to decline offers or remove unwanted items.",
  },
];

export function SurveyForm() {
  const { sessionId, setStep } = useExperimentStore();

  const [likertAnswers, setLikertAnswers] = useState<Record<string, number>>(
    {}
  );
  const [openEnded, setOpenEnded] = useState({
    q_unfair_experience: "",
    q_change_suggestion: "",
    q_additional_comments: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (sessionId) {
      trackScreenEntry(sessionId, "survey");
    }
  }, [sessionId]);

  const allLikertAnswered =
    LIKERT_QUESTIONS.every((q) => likertAnswers[q.key] !== undefined);
  const hasRequiredOpenEnded =
    openEnded.q_unfair_experience.trim().length > 0 &&
    openEnded.q_change_suggestion.trim().length > 0;
  const isValid = allLikertAnswered && hasRequiredOpenEnded;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid || !sessionId) return;
    setLoading(true);
    setError("");

    try {
      if (sessionId) {
        trackTap(sessionId, "survey", "submit_survey");
      }

      const { error: sError } = await supabase
        .from("survey_responses")
        .insert({
          session_id: sessionId,
          ...likertAnswers,
          ...openEnded,
        });

      if (sError) throw sError;

      // Update session completion time
      await supabase
        .from("sessions")
        .update({
          completed_at: new Date().toISOString(),
        })
        .eq("id", sessionId);

      setStep("complete");
    } catch (err) {
      console.error(err);
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-lg mx-auto p-4 py-8">
      <div className="text-center mb-6">
        <h1 className="text-xl font-bold text-gray-900">Post-Checkout Survey</h1>
        <p className="text-sm text-gray-500 mt-1">
          Please answer based on the checkout experience you just went through.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Likert scale questions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Rate the following statements
            </CardTitle>
            <p className="text-xs text-gray-500">
              1 = Strongly Disagree → 7 = Strongly Agree
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            {LIKERT_QUESTIONS.map((q, idx) => (
              <div key={q.key}>
                <Label className="text-sm text-gray-800 leading-relaxed">
                  {idx + 1}. {q.text}
                </Label>
                <div className="flex gap-1 mt-3">
                  {LIKERT_LABELS.map((label, i) => {
                    const value = i + 1;
                    const isSelected = likertAnswers[q.key] === value;
                    return (
                      <button
                        type="button"
                        key={value}
                        className={`flex-1 flex flex-col items-center gap-1 py-2 px-0.5 rounded-lg border transition-all ${
                          isSelected
                            ? "border-[#7B2D8E] bg-purple-50 text-[#7B2D8E]"
                            : "border-gray-200 text-gray-500 hover:border-gray-300"
                        }`}
                        onClick={() => {
                          setLikertAnswers((prev) => ({
                            ...prev,
                            [q.key]: value,
                          }));
                          if (sessionId) {
                            trackTap(
                              sessionId,
                              "survey",
                              `likert_${q.key}`,
                              String(value)
                            );
                          }
                        }}
                      >
                        <span
                          className={`text-sm font-semibold ${
                            isSelected ? "text-[#7B2D8E]" : ""
                          }`}
                        >
                          {value}
                        </span>
                        <span className="text-[8px] leading-tight text-center hidden sm:block">
                          {label}
                        </span>
                      </button>
                    );
                  })}
                </div>
                {idx < LIKERT_QUESTIONS.length - 1 && (
                  <Separator className="mt-5" />
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Open-ended questions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Your Thoughts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label className="text-sm text-gray-800">
                Was there anything about the checkout experience that felt
                unfair or manipulative? Please describe.{" "}
                <span className="text-red-500">*</span>
              </Label>
              <Textarea
                placeholder="Describe anything that felt off, tricky, or unfair..."
                value={openEnded.q_unfair_experience}
                onChange={(e) =>
                  setOpenEnded((s) => ({
                    ...s,
                    q_unfair_experience: e.target.value,
                  }))
                }
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm text-gray-800">
                If you could change one thing about this app&apos;s checkout
                process, what would it be?{" "}
                <span className="text-red-500">*</span>
              </Label>
              <Textarea
                placeholder="What would you improve or change..."
                value={openEnded.q_change_suggestion}
                onChange={(e) =>
                  setOpenEnded((s) => ({
                    ...s,
                    q_change_suggestion: e.target.value,
                  }))
                }
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm text-gray-800">
                Any additional comments about your experience? (optional)
              </Label>
              <Textarea
                placeholder="Anything else you'd like to share..."
                value={openEnded.q_additional_comments}
                onChange={(e) =>
                  setOpenEnded((s) => ({
                    ...s,
                    q_additional_comments: e.target.value,
                  }))
                }
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">
            {error}
          </p>
        )}

        <Button
          type="submit"
          className="w-full bg-[#7B2D8E] hover:bg-[#6A2579] text-white"
          size="lg"
          disabled={!isValid || loading}
        >
          {loading ? "Submitting..." : "Submit Survey"}
        </Button>
      </form>
    </div>
  );
}
