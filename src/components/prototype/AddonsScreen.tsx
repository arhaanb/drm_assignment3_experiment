"use client";

import { useEffect, useState } from "react";
import { useExperimentStore } from "@/lib/store";
import { MobileShell } from "./MobileShell";
import { AppHeader } from "./AppHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ADDON_ITEMS } from "@/lib/constants";
import {
  trackScreenEntry,
  trackScreenExit,
  trackTap,
  trackAddon,
  trackPopup,
  trackCartAction,
} from "@/lib/tracking";

export function AddonsScreen() {
  const {
    sessionId,
    assignedGroup,
    addItem,
    setStep,
    incrementAddonsAccepted,
    incrementAddonsDeclined,
    setScreenEnteredAt,
  } = useExperimentStore();

  const isDark = assignedGroup === "dark_pattern";
  const [enteredAt] = useState(Date.now());
  const [showUpsellPopup, setShowUpsellPopup] = useState(false);
  const [showSecondPopup, setShowSecondPopup] = useState(false);
  const [addonStates, setAddonStates] = useState<
    Record<string, "pending" | "added" | "declined">
  >({});

  useEffect(() => {
    if (sessionId) {
      trackScreenEntry(sessionId, "addons");
      setScreenEnteredAt(Date.now());

      // Track each addon being shown
      ADDON_ITEMS.forEach((item) => {
        trackAddon(sessionId, "addons", "shown", item.id, item.name);
      });

      // Dark pattern: show upsell popup after 1.5s
      if (isDark) {
        const timer = setTimeout(() => {
          setShowUpsellPopup(true);
          trackPopup(sessionId, "addons", "shown", "upsell_popup");
        }, 1500);
        return () => clearTimeout(timer);
      }
    }
  }, [sessionId, isDark, setScreenEnteredAt]);

  function handleAddAddon(itemId: string, itemName: string, price: number) {
    if (sessionId) {
      trackAddon(sessionId, "addons", "accepted", itemId, itemName);
      trackCartAction(sessionId, "addons", "add", itemId, itemName, price, 1);
    }
    const item = ADDON_ITEMS.find((i) => i.id === itemId);
    if (item) addItem(item);
    incrementAddonsAccepted();
    setAddonStates((s) => ({ ...s, [itemId]: "added" }));
  }

  function handleDeclineAddon(itemId: string, itemName: string) {
    if (sessionId) {
      trackAddon(sessionId, "addons", "declined", itemId, itemName);
    }
    incrementAddonsDeclined();
    setAddonStates((s) => ({ ...s, [itemId]: "declined" }));
  }

  function handleDismissUpsell() {
    if (sessionId) {
      trackPopup(sessionId, "addons", "dismissed", "upsell_popup");
    }
    setShowUpsellPopup(false);
    // Dark: show second nagging popup
    if (isDark && !showSecondPopup) {
      setTimeout(() => {
        setShowSecondPopup(true);
        if (sessionId) {
          trackPopup(sessionId, "addons", "shown", "upsell_nag_popup");
        }
      }, 500);
    }
  }

  function handleAcceptUpsell() {
    if (sessionId) {
      trackPopup(sessionId, "addons", "accepted", "upsell_popup");
    }
    handleAddAddon("chips", "Lay's Classic Salted", 20);
    setShowUpsellPopup(false);
  }

  function handleDismissSecondPopup() {
    if (sessionId) {
      trackPopup(sessionId, "addons", "dismissed", "upsell_nag_popup");
    }
    setShowSecondPopup(false);
  }

  function handleNext() {
    if (sessionId) {
      trackScreenExit(sessionId, "addons", enteredAt);
      trackTap(sessionId, "addons", "proceed_to_checkout");
    }
    // Track any remaining pending addons as declined
    ADDON_ITEMS.forEach((item) => {
      if (!addonStates[item.id]) {
        if (sessionId) {
          trackAddon(sessionId, "addons", "declined", item.id, item.name);
        }
        incrementAddonsDeclined();
      }
    });
    setStep("checkout");
  }

  return (
    <MobileShell>
      <AppHeader />

      <div className="flex-1 overflow-y-auto pb-28">
        <div className="px-4 pt-4 pb-2">
          <h2 className="font-bold text-lg text-gray-900">
            {isDark
              ? "🔥 Don't miss these deals!"
              : "You might also like"}
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            {isDark
              ? "Most customers add these to their order"
              : "Popular items that go well with your cart"}
          </p>
        </div>

        <div className="px-4 space-y-3">
          {ADDON_ITEMS.map((item) => {
            const state = addonStates[item.id];

            return (
              <div
                key={item.id}
                className={`flex items-center gap-3 border rounded-xl p-3 transition-all ${
                  state === "added"
                    ? "border-green-200 bg-green-50"
                    : state === "declined"
                    ? "border-gray-100 bg-gray-50 opacity-60"
                    : "border-gray-100 bg-white"
                }`}
              >
                <div className="text-3xl w-14 h-14 flex items-center justify-center bg-gray-50 rounded-lg shrink-0">
                  {item.image}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {item.name}
                    </p>
                    {item.tag && (
                      <Badge
                        variant="secondary"
                        className="text-[10px] bg-orange-50 text-orange-700 shrink-0"
                      >
                        {item.tag}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-gray-500">{item.description}</p>
                  <p className="text-sm font-semibold text-gray-900 mt-0.5">
                    ₹{item.price}
                  </p>
                </div>
                <div className="shrink-0">
                  {state === "added" ? (
                    <span className="text-xs text-green-700 font-medium">
                      ✓ Added
                    </span>
                  ) : state === "declined" ? (
                    <span className="text-xs text-gray-400">Skipped</span>
                  ) : isDark ? (
                    <div className="flex flex-col items-center gap-1">
                      <Button
                        size="sm"
                        className="bg-[#7B2D8E] hover:bg-[#6A2579] text-white text-xs px-4 py-1 rounded-lg font-semibold"
                        onClick={() =>
                          handleAddAddon(item.id, item.name, item.price)
                        }
                      >
                        ADD
                      </Button>
                      <button
                        className="text-[10px] text-gray-400 hover:text-gray-500"
                        onClick={() =>
                          handleDeclineAddon(item.id, item.name)
                        }
                      >
                        no thanks
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs px-3 py-1 rounded-lg"
                        onClick={() =>
                          handleDeclineAddon(item.id, item.name)
                        }
                      >
                        Skip
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs px-3 py-1 rounded-lg border-[#7B2D8E] text-[#7B2D8E]"
                        onClick={() =>
                          handleAddAddon(item.id, item.name, item.price)
                        }
                      >
                        Add ₹{item.price}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Dark pattern: Upsell popup overlay */}
      {isDark && showUpsellPopup && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end max-w-[420px] mx-auto">
          <div className="bg-white rounded-t-2xl w-full p-5 space-y-4 animate-in slide-in-from-bottom">
            <div className="text-center">
              <div className="text-5xl mb-2">🥔</div>
              <h3 className="text-lg font-bold text-gray-900">
                Wait! Don&apos;t miss this deal
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                Lay&apos;s Classic Salted — only <strong>₹20!</strong>
              </p>
              <p className="text-xs text-green-600 font-medium mt-1">
                🏆 Most ordered snack with dinner orders
              </p>
            </div>
            <Button
              className="w-full bg-[#7B2D8E] hover:bg-[#6A2579] text-white py-3 rounded-xl text-base font-semibold"
              onClick={handleAcceptUpsell}
            >
              Add to Cart — ₹20
            </Button>
            <button
              className="w-full text-xs text-gray-400 py-2"
              onClick={handleDismissUpsell}
            >
              No thanks, I&apos;ll pay full price later
            </button>
          </div>
        </div>
      )}

      {/* Dark pattern: Second nagging popup */}
      {isDark && showSecondPopup && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center max-w-[420px] mx-auto px-6">
          <div className="bg-white rounded-2xl w-full p-5 space-y-3">
            <p className="text-sm text-gray-900 font-medium text-center">
              Are you sure? 🤔
            </p>
            <p className="text-xs text-gray-500 text-center">
              72% of customers add a snack to their dinner order
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1 text-xs"
                onClick={handleDismissSecondPopup}
              >
                I&apos;m sure
              </Button>
              <Button
                className="flex-1 bg-[#7B2D8E] hover:bg-[#6A2579] text-white text-xs"
                onClick={() => {
                  handleAcceptUpsell();
                  setShowSecondPopup(false);
                }}
              >
                Add snack ₹20
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom bar */}
      <div className="fixed bottom-0 left-0 right-0 max-w-[420px] mx-auto bg-white border-t border-gray-200 p-4 shadow-[0_-4px_12px_rgba(0,0,0,0.08)]">
        <Button
          className="w-full bg-[#7B2D8E] hover:bg-[#6A2579] text-white py-3 rounded-xl text-base font-semibold"
          onClick={handleNext}
        >
          Continue to Checkout →
        </Button>
      </div>
    </MobileShell>
  );
}
