"use client";

import { useEffect } from "react";
import { useExperimentStore } from "@/lib/store";
import { ProgressBar } from "@/components/ProgressBar";
import { ConsentScreen } from "@/components/steps/ConsentScreen";
import { DemographicsForm } from "@/components/steps/DemographicsForm";
import { IntroScreen } from "@/components/steps/IntroScreen";
import { CartScreen } from "@/components/prototype/CartScreen";
import { AddonsScreen } from "@/components/prototype/AddonsScreen";
import { CheckoutScreen } from "@/components/prototype/CheckoutScreen";
import { ConfirmationScreen } from "@/components/prototype/ConfirmationScreen";
import { SurveyForm } from "@/components/steps/SurveyForm";
import { CompleteScreen } from "@/components/steps/CompleteScreen";

export default function Home() {
  const { currentStep, reset } = useExperimentStore();
  const isDev = process.env.NODE_ENV === "development";

  // If a previous participant completed and this is a fresh page load, reset
  useEffect(() => {
    if (localStorage.getItem("drm_completed") === "true") {
      localStorage.removeItem("drm_completed");
      reset();
    }
  }, [reset]);

  return (
    <main className="flex-1 flex flex-col items-center min-h-screen">
      <ProgressBar />
      {currentStep === "consent" && <ConsentScreen />}
      {currentStep === "demographics" && <DemographicsForm />}
      {currentStep === "intro" && <IntroScreen />}
      {currentStep === "cart" && <CartScreen />}
      {currentStep === "addons" && <AddonsScreen />}
      {currentStep === "checkout" && <CheckoutScreen />}
      {currentStep === "confirmation" && <ConfirmationScreen />}
      {currentStep === "survey" && <SurveyForm />}
      {currentStep === "complete" && <CompleteScreen />}
      {isDev && (
        <button
          onClick={reset}
          className="fixed bottom-4 right-4 z-50 bg-red-500 text-white text-xs px-3 py-1.5 rounded-full shadow-lg hover:bg-red-600 cursor-pointer"
        >
          Reset
        </button>
      )}
    </main>
  );
}
