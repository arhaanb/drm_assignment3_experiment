"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { useExperimentStore } from "@/lib/store";
import { toast } from "sonner";

export function ConsentScreen() {
  const setStep = useExperimentStore((s) => s.setStep);
  const [consented, setConsented] = useState(false);

  function handleContinue() {
    if (!consented) {
      toast.error("Please check the consent box to continue.");
      document.getElementById("consent-checkbox")?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
      return;
    }
    setStep("demographics");
  }

  return (
    <div className="w-full max-w-lg mx-auto p-4 py-8">
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Quick Commerce Checkout Study
        </h1>
        <p className="text-sm text-gray-500 mt-2">
          Design Research & Methodology
        </p>
      </div>

      <Card>
        <CardContent className="p-6 space-y-5">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              About This Study
            </h2>
            <p className="text-sm text-gray-600 mt-2 leading-relaxed">
              This study is being conducted by{" "}
              <strong>Arhaan Bahadur</strong> from{" "}
              <strong>IIIT Delhi</strong> as part of the{" "}
              <strong>Design Research & Methodology (DRM)</strong> course.
            </p>
            <p className="text-sm text-gray-600 mt-2 leading-relaxed">
              The goal is to understand how checkout design in quick commerce
              apps (like Zepto, Blinkit, Swiggy Instamart) affects your
              experience and decisions.
            </p>
          </div>

          <Separator />

          <div>
            <h3 className="text-sm font-semibold text-gray-900">
              What will you do?
            </h3>
            <ul className="text-sm text-gray-600 mt-2 space-y-1.5 list-disc list-inside">
              <li>Fill out a short demographics form</li>
              <li>
                Go through a simulated grocery checkout (like ordering dinner)
              </li>
              <li>Answer a brief survey about your experience</li>
            </ul>
            <p className="text-xs text-gray-500 mt-2">
              Total time: approximately 5-8 minutes. No real payment is
              involved.
            </p>
          </div>

          <Separator />

          <div>
            <h3 className="text-sm font-semibold text-gray-900">
              Data & Privacy
            </h3>
            <p className="text-sm text-gray-600 mt-2 leading-relaxed">
              Your responses are collected solely for academic research. All
              data is stored securely and will be anonymized in any published
              analysis. You can withdraw at any time by closing the tab.
            </p>
          </div>

          <Separator />

          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="shrink-0">
                <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center text-lg">
                  🎓
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">
                  Arhaan Bahadur
                </p>
                <p className="text-xs text-gray-500">
                  IIIT Delhi — B.Des 2022093
                </p>
                <p className="text-xs text-gray-500">
                  Design Research & Methodology
                </p>
              </div>
            </div>
          </div>

          <Separator />

          <label
            id="consent-checkbox"
            className="flex items-start gap-3 cursor-pointer"
          >
            <Checkbox
              checked={consented}
              onCheckedChange={(checked) => setConsented(checked === true)}
              className="mt-0.5"
            />
            <span className="text-sm text-gray-700 leading-relaxed">
              I understand that this is a research study, my participation is
              voluntary, and my data will be used for academic purposes only.
              I consent to participate.
            </span>
          </label>

          <Button
            className="w-full bg-[#7B2D8E] hover:bg-[#6A2579] text-white cursor-pointer"
            size="lg"
            onClick={handleContinue}
          >
            Continue →
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
