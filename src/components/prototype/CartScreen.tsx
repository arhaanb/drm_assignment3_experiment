"use client";

import { useEffect, useState } from "react";
import { useExperimentStore } from "@/lib/store";
import { MobileShell } from "./MobileShell";
import { AppHeader } from "./AppHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  trackScreenEntry,
  trackScreenExit,
  trackTap,
  trackCartAction,
} from "@/lib/tracking";

export function CartScreen() {
  const {
    sessionId,
    assignedGroup,
    cartItems,
    updateQuantity,
    removeItem,
    getSubtotal,
    setStep,
    setScreenEnteredAt,
  } = useExperimentStore();

  const isDark = assignedGroup === "dark_pattern";
  const [enteredAt] = useState(Date.now());

  useEffect(() => {
    if (sessionId) {
      trackScreenEntry(sessionId, "cart");
      setScreenEnteredAt(Date.now());
      if (isDark) {
        trackTap(sessionId, "cart", "urgency_banner_shown");
        trackTap(sessionId, "cart", "free_delivery_nudge_shown");
      }
    }
  }, [sessionId, isDark, setScreenEnteredAt]);

  function handleNext() {
    if (sessionId) {
      trackScreenExit(sessionId, "cart", enteredAt);
      trackTap(sessionId, "cart", "proceed_to_addons");
    }
    setStep("addons");
  }

  function handleQuantityChange(
    itemId: string,
    itemName: string,
    price: number,
    newQty: number
  ) {
    if (sessionId) {
      trackCartAction(
        sessionId,
        "cart",
        newQty === 0 ? "remove" : "quantity_change",
        itemId,
        itemName,
        price,
        newQty
      );
    }
    if (newQty === 0) {
      removeItem(itemId);
    } else {
      updateQuantity(itemId, newQty);
    }
  }

  const subtotal = getSubtotal();
  const itemCount = cartItems.reduce((s, i) => s + i.quantity, 0);

  return (
    <MobileShell>
      <AppHeader />

      {/* Urgency banner (dark pattern only) */}
      {isDark && (
        <div className="bg-yellow-400 text-yellow-900 px-4 py-2 text-xs font-semibold flex items-center gap-2 animate-pulse">
          <span>⚡</span>
          <span>Delivery in 8 min! Order quickly before slots fill up</span>
        </div>
      )}

      {/* Free delivery nudge */}
      {isDark && (
        <div className="bg-purple-50 border-b border-purple-100 px-4 py-2.5 text-xs text-purple-800">
          🎉 Add items worth <strong>₹{Math.max(0, 599 - subtotal)}</strong>{" "}
          more to get <strong>FREE express delivery!</strong>
        </div>
      )}

      <div className="flex-1 overflow-y-auto pb-32">
        {/* Cart header */}
        <div className="px-4 pt-4 pb-2 flex items-center justify-between">
          <h2 className="font-bold text-lg text-gray-900">
            Your Cart{" "}
            <span className="text-sm font-normal text-gray-500">
              ({itemCount} items)
            </span>
          </h2>
        </div>

        {/* Cart items */}
        <div className="px-4 space-y-3">
          {cartItems.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-3 bg-white border border-gray-100 rounded-xl p-3"
            >
              <div className="text-3xl w-12 h-12 flex items-center justify-center bg-gray-50 rounded-lg">
                {item.image}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start gap-1">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {item.name}
                  </p>
                  {/* Sneaked item indicator - dark pattern shows nothing, ethical would never have it */}
                  {isDark && item.id === "curd" && (
                    <Badge
                      variant="secondary"
                      className="text-[10px] bg-green-50 text-green-700 shrink-0"
                    >
                      Auto-added
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-gray-500">{item.description}</p>
                <p className="text-sm font-semibold text-gray-900 mt-0.5">
                  ₹{item.price}
                </p>
              </div>
              <div className="flex items-center gap-0 border border-gray-200 rounded-lg overflow-hidden">
                <button
                  className="w-8 h-8 flex items-center justify-center text-gray-600 hover:bg-gray-50 text-lg"
                  onClick={() =>
                    handleQuantityChange(
                      item.id,
                      item.name,
                      item.price,
                      item.quantity - 1
                    )
                  }
                >
                  {item.quantity === 1 ? (
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                    </svg>
                  ) : (
                    "−"
                  )}
                </button>
                <span className="w-8 h-8 flex items-center justify-center text-sm font-semibold bg-[#7B2D8E] text-white">
                  {item.quantity}
                </span>
                <button
                  className="w-8 h-8 flex items-center justify-center text-gray-600 hover:bg-gray-50 text-lg"
                  onClick={() =>
                    handleQuantityChange(
                      item.id,
                      item.name,
                      item.price,
                      item.quantity + 1
                    )
                  }
                >
                  +
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Bill summary teaser */}
        <div className="mx-4 mt-4 bg-gray-50 rounded-xl p-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Subtotal</span>
            <span className="font-semibold text-gray-900">₹{subtotal}</span>
          </div>
          {!isDark && (
            <div className="mt-1 space-y-1">
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>Platform fee</span>
                <span>₹5</span>
              </div>
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>Handling fee</span>
                <span>₹4</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom bar */}
      <div className="fixed bottom-0 left-0 right-0 max-w-[420px] mx-auto bg-white border-t border-gray-200 p-4 shadow-[0_-4px_12px_rgba(0,0,0,0.08)]">
        <div className="flex items-center justify-between mb-2">
          <div>
            <p className="text-xs text-gray-500">
              {isDark ? "Subtotal" : "Estimated total"}
            </p>
            <p className="text-lg font-bold text-gray-900">
              ₹{isDark ? subtotal : subtotal + 9}
            </p>
          </div>
          <Button
            className="bg-[#7B2D8E] hover:bg-[#6A2579] text-white px-8 py-3 rounded-xl text-base font-semibold"
            onClick={handleNext}
          >
            Proceed →
          </Button>
        </div>
      </div>
    </MobileShell>
  );
}
