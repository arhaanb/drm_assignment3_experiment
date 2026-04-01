"use client";

import { ReactNode } from "react";

// Wraps prototype screens in a mobile-like container
// On desktop: centered with max-width + phone frame appearance
// On mobile: full-width native feel
export function MobileShell({ children }: { children: ReactNode }) {
  return (
    <div className="w-full max-w-[420px] mx-auto min-h-screen bg-white flex flex-col shadow-2xl relative">
      {children}
    </div>
  );
}
