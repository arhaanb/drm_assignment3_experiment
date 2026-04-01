"use client";

import { useEffect, useState } from "react";
import { useExperimentStore } from "@/lib/store";
import { CartScreen } from "@/components/prototype/CartScreen";
import { AddonsScreen } from "@/components/prototype/AddonsScreen";
import { CheckoutScreen } from "@/components/prototype/CheckoutScreen";
import { ConfirmationScreen } from "@/components/prototype/ConfirmationScreen";

// Direct access to ethical prototype (for researcher testing)
// Skips demographics — creates no DB records
export default function EthicalPrototypePage() {
  const { currentStep, initExperiment, assignedGroup } = useExperimentStore();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!assignedGroup) {
      // Init with dummy IDs for preview mode
      initExperiment("preview-ethical", "preview-ethical-session", "ethical");
    }
    setReady(true);
  }, [assignedGroup, initExperiment]);

  if (!ready) return null;

  return (
    <main className="flex-1 flex items-start justify-center min-h-screen">
      <div className="w-full">
        <div className="bg-green-100 text-green-800 text-xs text-center py-1.5 font-medium">
          Preview Mode — Ethical Alternative Prototype
        </div>
        {(currentStep === "intro" || currentStep === "cart") && <CartScreen />}
        {currentStep === "addons" && <AddonsScreen />}
        {currentStep === "checkout" && <CheckoutScreen />}
        {currentStep === "confirmation" && <ConfirmationScreen />}
      </div>
    </main>
  );
}
