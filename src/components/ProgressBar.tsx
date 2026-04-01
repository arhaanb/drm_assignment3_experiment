"use client";

import { useExperimentStore, ExperimentStep } from "@/lib/store";

const STEPS: { key: ExperimentStep; label: string }[] = [
  { key: "consent", label: "Consent" },
  { key: "demographics", label: "About You" },
  { key: "cart", label: "Shopping" },
  { key: "survey", label: "Survey" },
];

// Map every step to which progress group it falls under
const STEP_TO_INDEX: Record<ExperimentStep, number> = {
  consent: 0,
  demographics: 1,
  intro: 2, // between demographics and shopping
  cart: 2,
  addons: 2,
  checkout: 2,
  confirmation: 2,
  survey: 3,
  complete: 4,
};

export function ProgressBar() {
  const currentStep = useExperimentStore((s) => s.currentStep);
  const idx = STEP_TO_INDEX[currentStep];

  if (currentStep === "complete") return null;

  return (
    <div className="w-full max-w-lg mx-auto px-6 pt-4">
      <div className="flex items-center gap-1">
        {STEPS.map((step, i) => (
          <div key={step.key} className="flex-1 flex flex-col items-center gap-1">
            <div
              className={`h-1.5 w-full rounded-full transition-colors ${
                i < idx
                  ? "bg-[#7B2D8E]"
                  : i === idx
                  ? "bg-[#7B2D8E]/60"
                  : "bg-gray-200"
              }`}
            />
            <span
              className={`text-[10px] ${
                i <= idx ? "text-[#7B2D8E] font-medium" : "text-gray-400"
              }`}
            >
              {step.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
