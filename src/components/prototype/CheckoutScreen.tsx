"use client";

import { useEffect, useState, useCallback } from "react";
import { useExperimentStore } from "@/lib/store";
import { MobileShell } from "./MobileShell";
import { AppHeader } from "./AppHeader";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/lib/supabase";
import {
  DELIVERY_OPTIONS,
  TIP_OPTIONS,
  CHARITY_AMOUNT,
  CHARITY_NAME,
  FEES,
} from "@/lib/constants";
import {
  trackScreenEntry,
  trackScreenExit,
  trackTap,
} from "@/lib/tracking";

export function CheckoutScreen() {
  const {
    sessionId,
    assignedGroup,
    cartItems,
    deliveryOption,
    setDeliveryOption,
    tipAmount,
    setTipAmount,
    charityOptIn,
    setCharityOptIn,
    getSubtotal,
    getDeliveryFee,
    getPlatformFee,
    getHandlingFee,
    getSurgeFee,
    getCharityAmount,
    getTotal,
    addonsAccepted,
    addonsDeclined,
    setStep,
    setScreenEnteredAt,
  } = useExperimentStore();

  const isDark = assignedGroup === "dark_pattern";
  const [enteredAt] = useState(Date.now());
  const [showFeeDetails, setShowFeeDetails] = useState(!isDark);
  const [countdown, setCountdown] = useState(120); // 2 min countdown for dark
  const [placing, setPlacing] = useState(false);

  useEffect(() => {
    if (sessionId) {
      trackScreenEntry(sessionId, "checkout");
      setScreenEnteredAt(Date.now());
    }
  }, [sessionId, setScreenEnteredAt]);

  // Countdown timer for dark pattern
  useEffect(() => {
    if (!isDark) return;
    const interval = setInterval(() => {
      setCountdown((c) => (c > 0 ? c - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [isDark]);

  function handleDeliveryChange(option: "express" | "standard") {
    if (sessionId) {
      trackTap(sessionId, "checkout", `delivery_${option}`, option);
    }
    setDeliveryOption(option);
  }

  function handleTipChange(amount: number) {
    if (sessionId) {
      trackTap(sessionId, "checkout", "tip_change", String(amount));
    }
    setTipAmount(amount);
  }

  function handleCharityToggle() {
    const newVal = !charityOptIn;
    if (sessionId) {
      trackTap(sessionId, "checkout", "charity_toggle", String(newVal));
    }
    setCharityOptIn(newVal);
  }

  function handleToggleFeeDetails() {
    setShowFeeDetails(!showFeeDetails);
    if (sessionId) {
      trackTap(
        sessionId,
        "checkout",
        "fee_details_toggle",
        String(!showFeeDetails)
      );
    }
  }

  const placeOrder = useCallback(async () => {
    if (placing) return;
    setPlacing(true);
    if (sessionId) {
      trackScreenExit(sessionId, "checkout", enteredAt);
      trackTap(sessionId, "checkout", "place_order", String(getTotal()));

      // Save checkout data
      await supabase.from("checkout_data").insert({
        session_id: sessionId,
        subtotal: getSubtotal(),
        delivery_fee: getDeliveryFee(),
        platform_fee: getPlatformFee(),
        handling_fee: getHandlingFee(),
        surge_fee: getSurgeFee(),
        tip_amount: tipAmount,
        charity_amount: getCharityAmount(),
        total_amount: getTotal(),
        delivery_option: deliveryOption,
        items_in_cart: cartItems.reduce((s, i) => s + i.quantity, 0),
        addons_accepted: addonsAccepted,
        addons_declined: addonsDeclined,
      });
    }
    setStep("confirmation");
  }, [
    placing,
    sessionId,
    enteredAt,
    getTotal,
    getSubtotal,
    getDeliveryFee,
    getPlatformFee,
    getHandlingFee,
    getSurgeFee,
    tipAmount,
    getCharityAmount,
    deliveryOption,
    cartItems,
    addonsAccepted,
    addonsDeclined,
    setStep,
  ]);

  const subtotal = getSubtotal();
  const deliveryFee = getDeliveryFee();
  const platformFee = getPlatformFee();
  const handlingFee = getHandlingFee();
  const surgeFee = getSurgeFee();
  const charityAmount = getCharityAmount();
  const total = getTotal();

  const formatTime = (s: number) =>
    `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  return (
    <MobileShell>
      <AppHeader />

      {/* Dark pattern: urgency countdown */}
      {isDark && (
        <div className="bg-red-500 text-white px-4 py-2 text-xs font-semibold flex items-center justify-between">
          <span>⚡ Delivers in 8 min!</span>
          <span className="bg-white/20 rounded px-2 py-0.5 font-mono">
            Order in {formatTime(countdown)}
          </span>
        </div>
      )}

      <div className="flex-1 overflow-y-auto pb-36">
        {/* Delivery options */}
        <div className="px-4 pt-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">
            Delivery
          </h3>
          {isDark ? (
            <div className="space-y-2">
              {/* Express prominent */}
              <button
                className={`w-full flex items-center justify-between p-3 rounded-xl border-2 transition-all ${
                  deliveryOption === "express"
                    ? "border-[#7B2D8E] bg-purple-50"
                    : "border-gray-200"
                }`}
                onClick={() => handleDeliveryChange("express")}
              >
                <div className="flex items-center gap-2">
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      deliveryOption === "express"
                        ? "border-[#7B2D8E]"
                        : "border-gray-300"
                    }`}
                  >
                    {deliveryOption === "express" && (
                      <div className="w-3 h-3 rounded-full bg-[#7B2D8E]" />
                    )}
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-semibold text-gray-900">
                      ⚡ {DELIVERY_OPTIONS.express.label}
                    </p>
                    <p className="text-xs text-green-600 font-medium">
                      {DELIVERY_OPTIONS.express.time} — Fastest!
                    </p>
                  </div>
                </div>
                <span className="text-sm font-semibold text-gray-900">
                  ₹{DELIVERY_OPTIONS.express.fee}
                </span>
              </button>
              {/* Standard buried */}
              <button
                className={`w-full flex items-center justify-between p-2.5 rounded-lg transition-all ${
                  deliveryOption === "standard"
                    ? "border-2 border-[#7B2D8E] bg-purple-50"
                    : "border border-gray-100"
                }`}
                onClick={() => handleDeliveryChange("standard")}
              >
                <div className="flex items-center gap-2">
                  <div
                    className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                      deliveryOption === "standard"
                        ? "border-[#7B2D8E]"
                        : "border-gray-300"
                    }`}
                  >
                    {deliveryOption === "standard" && (
                      <div className="w-2.5 h-2.5 rounded-full bg-[#7B2D8E]" />
                    )}
                  </div>
                  <p className="text-xs text-gray-400">
                    Standard ({DELIVERY_OPTIONS.standard.time})
                  </p>
                </div>
                <span className="text-xs text-gray-400">Free</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <button
                className={`flex flex-col items-center p-3 rounded-xl border-2 transition-all ${
                  deliveryOption === "standard"
                    ? "border-[#7B2D8E] bg-purple-50"
                    : "border-gray-200"
                }`}
                onClick={() => handleDeliveryChange("standard")}
              >
                <p className="text-sm font-semibold text-gray-900">Standard</p>
                <p className="text-xs text-gray-500">
                  {DELIVERY_OPTIONS.standard.time}
                </p>
                <p className="text-sm font-bold text-green-600 mt-1">Free</p>
              </button>
              <button
                className={`flex flex-col items-center p-3 rounded-xl border-2 transition-all ${
                  deliveryOption === "express"
                    ? "border-[#7B2D8E] bg-purple-50"
                    : "border-gray-200"
                }`}
                onClick={() => handleDeliveryChange("express")}
              >
                <p className="text-sm font-semibold text-gray-900">Express</p>
                <p className="text-xs text-gray-500">
                  {DELIVERY_OPTIONS.express.time}
                </p>
                <p className="text-sm font-bold text-gray-900 mt-1">
                  ₹{DELIVERY_OPTIONS.express.fee}
                </p>
              </button>
            </div>
          )}
        </div>

        <Separator className="my-4" />

        {/* Tip section */}
        <div className="px-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-1">
            {isDark
              ? "Thank your delivery partner 💛"
              : "Tip your delivery partner"}
          </h3>
          {isDark && (
            <p className="text-xs text-gray-500 mb-3">
              Your kindness means a lot! 100% goes to your rider.
            </p>
          )}
          <div className="flex gap-2">
            {TIP_OPTIONS.map((amount) => (
              <button
                key={amount}
                className={`flex-1 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all ${
                  tipAmount === amount
                    ? "border-[#7B2D8E] bg-purple-50 text-[#7B2D8E]"
                    : "border-gray-200 text-gray-600"
                } ${isDark && amount === 0 ? "opacity-50 text-xs" : ""}`}
                onClick={() => handleTipChange(amount)}
              >
                {amount === 0
                  ? isDark
                    ? "No tip"
                    : "₹0"
                  : `₹${amount}`}
              </button>
            ))}
          </div>
          {isDark && tipAmount === 0 && (
            <p className="text-xs text-gray-400 mt-2 italic">
              Are you sure? Your delivery partner earns an average of ₹35 per
              delivery...
            </p>
          )}
        </div>

        <Separator className="my-4" />

        {/* Charity section */}
        <div className="px-4">
          {isDark ? (
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={charityOptIn}
                onChange={handleCharityToggle}
                className="w-4 h-4 accent-[#7B2D8E]"
              />
              <div className="flex-1">
                <span className="text-xs text-gray-600">
                  Donate ₹{CHARITY_AMOUNT} to {CHARITY_NAME} 🙏
                </span>
              </div>
            </label>
          ) : (
            <div>
              <p className="text-sm font-semibold text-gray-900 mb-2">
                Donate to {CHARITY_NAME}?
              </p>
              <p className="text-xs text-gray-500 mb-3">
                Add ₹{CHARITY_AMOUNT} to help provide meals to those in need.
              </p>
              <div className="flex gap-2">
                <Button
                  variant={charityOptIn ? "default" : "outline"}
                  size="sm"
                  className={
                    charityOptIn
                      ? "bg-[#7B2D8E] hover:bg-[#6A2579] text-white flex-1"
                      : "flex-1"
                  }
                  onClick={() => {
                    if (!charityOptIn) handleCharityToggle();
                  }}
                >
                  Yes, donate ₹{CHARITY_AMOUNT}
                </Button>
                <Button
                  variant={!charityOptIn ? "default" : "outline"}
                  size="sm"
                  className={
                    !charityOptIn
                      ? "bg-gray-800 hover:bg-gray-900 text-white flex-1"
                      : "flex-1"
                  }
                  onClick={() => {
                    if (charityOptIn) handleCharityToggle();
                  }}
                >
                  No, skip
                </Button>
              </div>
            </div>
          )}
        </div>

        <Separator className="my-4" />

        {/* Bill details */}
        <div className="px-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-900">
              Bill Details
            </h3>
            {isDark && (
              <button
                className="text-xs text-[#7B2D8E] font-medium"
                onClick={handleToggleFeeDetails}
              >
                {showFeeDetails ? "Hide details" : "View details ›"}
              </button>
            )}
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Item total</span>
              <span className="text-gray-900">₹{subtotal}</span>
            </div>

            <div className="flex justify-between">
              <span className="text-gray-600">
                Delivery{" "}
                {deliveryOption === "express" && (
                  <span className="text-xs text-purple-600">(Express)</span>
                )}
              </span>
              <span
                className={
                  deliveryFee === 0
                    ? "text-green-600 font-medium"
                    : "text-gray-900"
                }
              >
                {deliveryFee === 0 ? "FREE" : `₹${deliveryFee}`}
              </span>
            </div>

            {showFeeDetails && (
              <>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Platform fee</span>
                  <span className="text-gray-600">₹{platformFee}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Handling fee</span>
                  <span className="text-gray-600">₹{handlingFee}</span>
                </div>
                {isDark && surgeFee > 0 && (
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">
                      Surge fee{" "}
                      <span className="text-gray-400">(high demand)</span>
                    </span>
                    <span className="text-gray-600">₹{surgeFee}</span>
                  </div>
                )}
              </>
            )}

            {tipAmount > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-600">Delivery partner tip</span>
                <span className="text-gray-900">₹{tipAmount}</span>
              </div>
            )}

            {charityAmount > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-600">{CHARITY_NAME} donation</span>
                <span className="text-gray-900">₹{charityAmount}</span>
              </div>
            )}

            <Separator />

            <div className="flex justify-between font-bold text-base">
              <span className="text-gray-900">Total</span>
              <span className="text-gray-900">₹{total}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom bar - Place order */}
      <div className="fixed bottom-0 left-0 right-0 max-w-[420px] mx-auto bg-white border-t border-gray-200 p-4 shadow-[0_-4px_12px_rgba(0,0,0,0.08)]">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-lg font-bold text-gray-900">₹{total}</p>
            <p className="text-xs text-gray-500">Total amount</p>
          </div>
          <Button
            className="bg-[#7B2D8E] hover:bg-[#6A2579] text-white px-8 py-3 rounded-xl text-base font-semibold"
            disabled={placing}
            onClick={placeOrder}
          >
            {placing ? "Placing..." : "Place Order"}
          </Button>
        </div>
      </div>
    </MobileShell>
  );
}
