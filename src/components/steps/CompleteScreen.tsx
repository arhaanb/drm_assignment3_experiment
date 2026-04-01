"use client";

import { Card, CardContent } from "@/components/ui/card";
import { useExperimentStore } from "@/lib/store";
import { useEffect } from "react";
import { trackScreenEntry } from "@/lib/tracking";

export function CompleteScreen() {
  const { sessionId, reset } = useExperimentStore();

  useEffect(() => {
    if (sessionId) {
      trackScreenEntry(sessionId, "complete");
    }
  }, [sessionId]);

  // Flag that experiment is done — page.tsx checks this on load
  useEffect(() => {
    localStorage.setItem("drm_completed", "true");
  }, []);

  return (
    <div className="w-full max-w-lg mx-auto p-4 py-12">
      <Card>
        <CardContent className="p-8 text-center space-y-6">
          <div className="text-5xl">🎉</div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Thank You!</h2>
            <p className="text-gray-600 mt-2">
              Your responses have been recorded. Thank you for contributing to
              this research on ethical design in quick commerce apps.
            </p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-500">
            <p>
              <strong>Study:</strong> Ethical Persuasive Design & User Autonomy
            </p>
            <p className="mt-1">
              <strong>Researcher:</strong> Arhaan Bahadur — IIIT Delhi
            </p>
            <p className="mt-1">
              <strong>Course:</strong> Design Research & Methodology
            </p>
          </div>
          <p className="text-xs text-gray-400">
            You can safely close this tab. Refreshing will allow a new
            participant to fill in the form.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
