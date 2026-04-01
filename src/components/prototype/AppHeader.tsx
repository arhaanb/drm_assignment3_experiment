"use client";

import { useState } from "react";
import { useExperimentStore } from "@/lib/store";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

// Zepto-style app header with delivery info + help button
export function AppHeader() {
  const assignedGroup = useExperimentStore((s) => s.assignedGroup);
  const isDark = assignedGroup === "dark_pattern";

  return (
    <div className="bg-[#7B2D8E] text-white px-4 py-3 sticky top-0 z-40">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="text-lg font-bold tracking-tight">quickcart</div>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-xs bg-white/20 rounded-full px-2 py-0.5">
            {isDark ? "⚡ 8 min" : "15-20 min"}
          </div>
          <Dialog>
            <DialogTrigger>
              <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold cursor-pointer">
                ?
              </div>
            </DialogTrigger>
            <DialogContent className="max-w-sm">
              <DialogHeader>
                <DialogTitle>Task Reminder</DialogTitle>
              </DialogHeader>
              <div className="space-y-2 text-sm text-gray-600">
                <p>
                  You&apos;re ordering groceries for dinner using this app.
                </p>
                <p>
                  Go through the checkout as you normally would — there are no
                  right or wrong actions.
                </p>
                <p className="text-xs text-gray-400">
                  This is a simulated prototype. No real payment is involved.
                </p>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
      <div className="flex items-center gap-1 mt-1">
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="currentColor"
          className="opacity-80"
        >
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
        </svg>
        <span className="text-xs opacity-80 truncate">
          Home — Koramangala, Bangalore
        </span>
      </div>
    </div>
  );
}
