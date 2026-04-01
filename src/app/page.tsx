"use client";

import { useExperimentStore } from "@/lib/store";
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
  const currentStep = useExperimentStore((s) => s.currentStep);

  return (
    <main className="flex-1 flex items-start justify-center min-h-screen">
      {currentStep === "consent" && <ConsentScreen />}
      {currentStep === "demographics" && <DemographicsForm />}
      {currentStep === "intro" && <IntroScreen />}
      {currentStep === "cart" && <CartScreen />}
      {currentStep === "addons" && <AddonsScreen />}
      {currentStep === "checkout" && <CheckoutScreen />}
      {currentStep === "confirmation" && <ConfirmationScreen />}
      {currentStep === "survey" && <SurveyForm />}
      {currentStep === "complete" && <CompleteScreen />}
    </main>
  );
}
