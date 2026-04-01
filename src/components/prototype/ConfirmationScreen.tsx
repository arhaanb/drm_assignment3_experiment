"use client";

import { useEffect, useState } from "react";
import { useExperimentStore } from "@/lib/store";
import { MobileShell } from "./MobileShell";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/lib/supabase";
import {
  trackScreenEntry,
  trackScreenExit,
  trackTap,
} from "@/lib/tracking";

export function ConfirmationScreen() {
  const {
    sessionId,
    assignedGroup,
    cartItems,
    getSubtotal,
    getTotal,
    deliveryOption,
    tipAmount,
    getCharityAmount,
    getDeliveryFee,
    setStep,
  } = useExperimentStore();

  const isDark = assignedGroup === "dark_pattern";
  const [enteredAt] = useState(Date.now());

  useEffect(() => {
    if (sessionId) {
      trackScreenEntry(sessionId, "confirmation");

      // Mark session as completed
      supabase
        .from("sessions")
        .update({
          completed_at: new Date().toISOString(),
          total_duration_seconds: (Date.now() - enteredAt) / 1000,
        })
        .eq("id", sessionId)
        .then(() => {});
    }
  }, [sessionId, enteredAt]);

  function handleNext() {
    if (sessionId) {
      trackScreenExit(sessionId, "confirmation", enteredAt);
      trackTap(sessionId, "confirmation", "proceed_to_survey");
    }
    setStep("survey");
  }

  const total = getTotal();

  return (
    <MobileShell>
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-8">
        <div className="text-center space-y-4">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <svg
              width="40"
              height="40"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#16a34a"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>

          <div>
            <h2 className="text-xl font-bold text-gray-900">Order Placed!</h2>
            <p className="text-sm text-gray-500 mt-1">
              {isDark
                ? "Arriving in 8 minutes ⚡"
                : `Estimated delivery: ${
                    deliveryOption === "express" ? "8-10" : "15-20"
                  } minutes`}
            </p>
          </div>
        </div>

        <div className="w-full mt-8 bg-gray-50 rounded-xl p-4 space-y-3">
          <h3 className="text-sm font-semibold text-gray-900">
            Order Summary
          </h3>

          <div className="space-y-1.5">
            {cartItems.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between text-sm"
              >
                <span className="text-gray-600">
                  {item.image} {item.name}{" "}
                  {item.quantity > 1 && `x${item.quantity}`}
                </span>
                <span className="text-gray-900">
                  ₹{item.price * item.quantity}
                </span>
              </div>
            ))}
          </div>

          <Separator />

          <div className="space-y-1.5 text-sm">
            {getDeliveryFee() > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-500">Delivery</span>
                <span className="text-gray-600">₹{getDeliveryFee()}</span>
              </div>
            )}
            {tipAmount > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-500">Tip</span>
                <span className="text-gray-600">₹{tipAmount}</span>
              </div>
            )}
            {getCharityAmount() > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-500">Donation</span>
                <span className="text-gray-600">₹{getCharityAmount()}</span>
              </div>
            )}
          </div>

          <Separator />

          <div className="flex justify-between font-bold text-base">
            <span className="text-gray-900">Total Paid</span>
            <span className="text-gray-900">₹{total}</span>
          </div>
        </div>

        <div className="w-full mt-8 space-y-3">
          <p className="text-sm text-center text-gray-500">
            That&apos;s the end of the prototype!
            <br />
            Please continue to the short survey.
          </p>
          <Button
            className="w-full bg-[#7B2D8E] hover:bg-[#6A2579] text-white py-3 rounded-xl text-base font-semibold"
            onClick={handleNext}
          >
            Continue to Survey →
          </Button>
        </div>
      </div>
    </MobileShell>
  );
}
