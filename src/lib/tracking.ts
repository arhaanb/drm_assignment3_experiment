// ============================================================
// EVENT TRACKING
// Logs every user interaction to Supabase in real-time
// ============================================================

import { supabase } from "./supabase";

export type TrackingEvent = {
  session_id: string;
  event_type: string;
  event_target?: string;
  event_value?: string;
  screen?: string;
  metadata?: Record<string, unknown>;
};

// Batch queue for high-frequency events (scroll, etc.)
let eventQueue: TrackingEvent[] = [];
let flushTimeout: NodeJS.Timeout | null = null;

// Track a single event immediately
export async function trackEvent(event: TrackingEvent) {
  try {
    await supabase.from("interactions").insert({
      session_id: event.session_id,
      event_type: event.event_type,
      event_target: event.event_target || null,
      event_value: event.event_value || null,
      screen: event.screen || null,
      metadata: event.metadata || {},
    });
  } catch (error) {
    console.error("Failed to track event:", error);
  }
}

// Queue an event for batched insert (for high-frequency events)
export function queueEvent(event: TrackingEvent) {
  eventQueue.push(event);
  if (!flushTimeout) {
    flushTimeout = setTimeout(flushEvents, 2000);
  }
}

// Flush all queued events
export async function flushEvents() {
  if (eventQueue.length === 0) return;
  const events = [...eventQueue];
  eventQueue = [];
  flushTimeout = null;

  try {
    await supabase.from("interactions").insert(
      events.map((e) => ({
        session_id: e.session_id,
        event_type: e.event_type,
        event_target: e.event_target || null,
        event_value: e.event_value || null,
        screen: e.screen || null,
        metadata: e.metadata || {},
      }))
    );
  } catch (error) {
    console.error("Failed to flush events:", error);
  }
}

// Track screen entry with timestamp (for time-on-screen calculation)
export function trackScreenEntry(sessionId: string, screen: string) {
  trackEvent({
    session_id: sessionId,
    event_type: "screen_enter",
    screen,
    metadata: { entered_at: new Date().toISOString() },
  });
}

// Track screen exit with duration
export function trackScreenExit(
  sessionId: string,
  screen: string,
  enteredAt: number
) {
  const duration = (Date.now() - enteredAt) / 1000;
  trackEvent({
    session_id: sessionId,
    event_type: "screen_exit",
    screen,
    metadata: {
      duration_seconds: duration,
      exited_at: new Date().toISOString(),
    },
  });
}

// Track tap/click on any element
export function trackTap(
  sessionId: string,
  screen: string,
  target: string,
  value?: string
) {
  trackEvent({
    session_id: sessionId,
    event_type: "tap",
    event_target: target,
    event_value: value,
    screen,
  });
}

// Track cart modification
export function trackCartAction(
  sessionId: string,
  screen: string,
  action: "add" | "remove" | "quantity_change",
  itemId: string,
  itemName: string,
  price: number,
  quantity: number
) {
  trackEvent({
    session_id: sessionId,
    event_type: `cart_${action}`,
    event_target: itemId,
    event_value: String(price),
    screen,
    metadata: { item_name: itemName, quantity, price },
  });
}

// Track addon interaction
export function trackAddon(
  sessionId: string,
  screen: string,
  action: "shown" | "accepted" | "declined",
  itemId: string,
  itemName: string
) {
  trackEvent({
    session_id: sessionId,
    event_type: `addon_${action}`,
    event_target: itemId,
    screen,
    metadata: { item_name: itemName },
  });
}

// Track device / browser info (called once per session)
export function trackDeviceInfo(sessionId: string) {
  const ua = navigator.userAgent;
  const isMobile = /Mobile|Android|iPhone|iPod/i.test(ua);
  const isTablet = /iPad|Android(?!.*Mobile)/i.test(ua);

  // Parse browser
  let browser = "Unknown";
  if (/CriOS|Chrome/i.test(ua) && !/Edg/i.test(ua)) browser = "Chrome";
  else if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) browser = "Safari";
  else if (/Firefox|FxiOS/i.test(ua)) browser = "Firefox";
  else if (/Edg/i.test(ua)) browser = "Edge";
  else if (/OPR|Opera/i.test(ua)) browser = "Opera";

  // Parse OS
  let os = "Unknown";
  if (/Windows/i.test(ua)) os = "Windows";
  else if (/Mac OS X|Macintosh/i.test(ua)) os = "macOS";
  else if (/iPhone|iPad|iPod/i.test(ua)) os = "iOS";
  else if (/Android/i.test(ua)) os = "Android";
  else if (/Linux/i.test(ua)) os = "Linux";

  trackEvent({
    session_id: sessionId,
    event_type: "device_info",
    screen: "init",
    metadata: {
      user_agent: ua,
      device_type: isTablet ? "tablet" : isMobile ? "mobile" : "desktop",
      browser,
      os,
      screen_width: window.screen.width,
      screen_height: window.screen.height,
      viewport_width: window.innerWidth,
      viewport_height: window.innerHeight,
      pixel_ratio: window.devicePixelRatio,
      touch_support: "ontouchstart" in window,
      language: navigator.language,
      connection:
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (navigator as any).connection?.effectiveType ?? "unknown",
    },
  });
}

// Track popup interactions (dark pattern specific)
export function trackPopup(
  sessionId: string,
  screen: string,
  action: "shown" | "dismissed" | "accepted",
  popupType: string
) {
  trackEvent({
    session_id: sessionId,
    event_type: `popup_${action}`,
    event_target: popupType,
    screen,
  });
}
