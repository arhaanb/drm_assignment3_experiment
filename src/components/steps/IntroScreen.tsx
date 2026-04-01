"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useExperimentStore } from "@/lib/store";
import { trackScreenEntry, trackScreenExit } from "@/lib/tracking";
import { useState, useEffect } from "react";

export function IntroScreen() {
  const { sessionId, setStep } = useExperimentStore();
  const [enteredAt] = useState(Date.now());

  useEffect(() => {
    if (sessionId) {
      trackScreenEntry(sessionId, "intro");
    }
  }, [sessionId]);

  function handleStart() {
    if (sessionId) {
      trackScreenExit(sessionId, "intro", enteredAt);
    }
    setStep("cart");
  }

  return (
    <div className="w-full max-w-lg mx-auto p-4 py-12">
      <Card>
        <CardContent className="p-6 space-y-5">
          <div className="text-center">
            <div className="text-4xl mb-3">🛒</div>
            <h2 className="text-xl font-bold text-gray-900">Your Task</h2>
            <p className="text-sm text-gray-600 mt-2">
              Order groceries for dinner. Go through checkout as you normally
              would.
            </p>
          </div>

          <ul className="text-sm text-gray-600 space-y-1.5 list-disc list-inside bg-gray-50 rounded-lg p-4">
            <li>Simulated prototype — no real payment</li>
            <li>Short survey after checkout</li>
          </ul>

          <Button
            className="w-full bg-[#7B2D8E] hover:bg-[#6A2579] text-white cursor-pointer"
            size="lg"
            onClick={handleStart}
          >
            Open the App →
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
