# DRM Assignment 3 — Experiment: Ethical Persuasive Design in Quick Commerce Checkout

## Overview

This is a between-subjects A/B experiment built as a Next.js web app. Participants are randomly assigned to one of two groups and interact with a simulated quick commerce (Zepto-like) checkout prototype. All interactions are tracked in real-time to Supabase.

**Researcher:** Arhaan Bahadur (2022093)
**Course:** Design Research & Methodology

---

## Study Design

| Aspect | Detail |
|--------|--------|
| **Type** | Between-subjects A/B experiment |
| **Groups** | Control (Dark Pattern) vs. Treatment (Ethical Alternative) |
| **Assignment** | Alternating based on last completed session (ensures balance even with dropouts) |
| **Target N** | 20-30 participants |
| **Context** | Simulated Indian quick commerce grocery checkout |

### Hypotheses

- **H1:** Dark patterns lead to lower perceived user autonomy
- **H2:** Dark patterns lead to higher perceived manipulation and lower trust
- **H3:** Dark patterns lead to higher non-product charges (extra revenue from hidden fees, pre-selected extras — tested on extra_revenue, not raw totals, to control for cart modifications)

---

## Participant Flow

```
Demographics Form → Intro/Task Brief → Cart Review → Add-ons → Checkout → Order Confirmation → Post-Survey → Thank You
```

### Step 1: Demographics Form
Collects: name, email, age, gender, occupation, monthly quick commerce spending, app usage frequency.

### Step 2: Intro Screen
Task brief: "Imagine you're ordering groceries for dinner. Go through the checkout as you normally would."

### Step 3-6: Prototype (varies by group)
Mobile-native checkout flow styled after Zepto/Blinkit. See feature comparison below.

### Step 7: Post-Survey
7 Likert-scale questions + 3 open-ended questions.

### Step 8: Thank You / Complete

---

## Cart Items (Constant Across Both Groups)

| Item | Description | Price |
|------|------------|-------|
| India Gate Basmati Rice | 1 kg | ₹145 |
| Amul Fresh Paneer | 200 g | ₹90 |
| Onion | 1 kg | ₹42 |
| Tomato (Hybrid) | 500 g | ₹35 |
| Amul Toned Milk | 500 ml | ₹28 |
| Harvest Gold White Bread | 1 pack | ₹40 |
| Fortune Sunflower Oil | 1 L pouch | ₹155 |

**Base Subtotal: ₹669** (includes quantities: onion x2, milk x2, potato x2)

### Add-on Items Shown

| Item | Price | Tag |
|------|-------|-----|
| Lay's Classic Salted (52g) | ₹20 | Most ordered |
| Coca-Cola (750ml) | ₹38 | Bestseller |
| Amul Vanilla Cup (100ml) | ₹30 | — |
| Parle-G Gold (100g) | ₹20 | ₹20 only! |

---

## Feature Comparison: Dark Pattern vs. Ethical

### Cart Screen

| Feature | Dark Pattern (Control) | Ethical (Treatment) |
|---------|----------------------|---------------------|
| **Sneaked item** | Amul Dahi auto-added to cart (₹35) | No auto-added items |
| **Urgency** | Yellow banner: "Delivery in 8 min! Order quickly" + pulse animation | No urgency messaging |
| **Upsell nudge** | "Add ₹X more for FREE express delivery!" banner | Not shown |
| **Fee preview** | Only subtotal shown | Subtotal + platform fee (₹5) + handling fee (₹4) shown |
| **Bottom bar** | Shows "Subtotal" only | Shows "Estimated total" with fees included |

### Add-ons Screen

| Feature | Dark Pattern (Control) | Ethical (Treatment) |
|---------|----------------------|---------------------|
| **Heading** | "🔥 Don't miss these deals!" | "You might also like" |
| **Add buttons** | Large purple "ADD" button, tiny grey "no thanks" text | Equal-sized "Skip" and "Add ₹X" outline buttons |
| **Upsell popup** | Full-screen bottom sheet after 1.5s: "Wait! Don't miss this deal" | No popup |
| **Second nag popup** | If first dismissed: "Are you sure? 72% of customers add a snack" | No popup |
| **Decline copy** | "No thanks, I'll pay full price later" (confirmshaming) | "Skip" (neutral) |

### Checkout Screen

| Feature | Dark Pattern (Control) | Ethical (Treatment) |
|---------|----------------------|---------------------|
| **Delivery default** | Express (₹35) pre-selected | Standard (Free) pre-selected |
| **Delivery UI** | Express prominent with "⚡ Fastest!", Standard buried in small grey text | Side-by-side grid, equal visual weight |
| **Tip default** | ₹30 pre-selected, "Thank your delivery partner 💛" | ₹0 selected, neutral "Tip your delivery partner" |
| **Tip decline** | "No tip" button is faded (opacity-50), italic guilt text if ₹0 | All buttons same size and opacity |
| **Charity** | Pre-checked checkbox, inline with small text | Separate section with equal "Yes, donate ₹2" / "No, skip" buttons |
| **Fee breakdown** | Hidden behind "View details ›" toggle (collapsed by default) | Fully visible by default |
| **Surge fee** | ₹10 "high demand" fee (hidden in details) | No surge fee |
| **Urgency** | Red countdown bar: "Order in 2:00" | No countdown |
| **Promo codes** | 4 codes shown as cards — 3 are misleading (impossible min order / expired), 1 valid (₹20 off) | 2 clearly labeled valid codes + text input. "Codes available!" badge |

### Fees Summary

| Fee | Dark Pattern | Ethical |
|-----|-------------|---------|
| Platform fee | ₹5 (hidden) | ₹5 (visible) |
| Handling fee | ₹4 (hidden) | ₹4 (visible) |
| Surge fee | ₹10 | ₹0 |
| Express delivery | ₹35 (pre-selected) | ₹0 (Standard default) |
| Tip | ₹30 (pre-selected) | ₹0 (opt-in) |
| Charity | ₹2 (pre-checked) | ₹0 (opt-in) |
| Sneaked item | ₹35 (auto-added Dahi) | ₹0 |
| **Extra charges if unchanged** | **₹121** | **₹9** |

---

## Tracked Metrics

### Interaction Events (stored in `interactions` table)

Every user action is logged with: session_id, event_type, event_target, event_value, screen, metadata, timestamp.

| Event Type | Description | Screen |
|------------|-------------|--------|
| `screen_enter` | User enters a screen (with timestamp) | All |
| `screen_exit` | User leaves a screen (with duration_seconds) | All |
| `tap` | Any button/link tap | All |
| `cart_add` | Item added to cart | cart, addons |
| `cart_remove` | Item removed from cart | cart |
| `cart_quantity_change` | Quantity changed | cart |
| `addon_shown` | Add-on item displayed to user | addons |
| `addon_accepted` | User accepted an add-on | addons |
| `addon_declined` | User declined an add-on | addons |
| `popup_shown` | Upsell/nag popup displayed | addons |
| `popup_accepted` | User accepted popup offer | addons |
| `popup_dismissed` | User dismissed popup | addons |
| `device_info` | Browser, OS, screen size, touch, viewport | init |
| `urgency_banner_shown` | Dark pattern urgency banner displayed | cart |
| `free_delivery_nudge_shown` | Dark pattern upsell nudge displayed | cart |
| `promo_attempt` | User tried to apply a promo code | checkout |
| `promo_applied` | Promo code successfully applied (with discount) | checkout |
| `promo_failed` | Promo code was invalid/expired/min not met | checkout |
| `promo_removed` | User removed an applied promo | checkout |

### Checkout Data (stored in `checkout_data` table)

Captured at order placement:

| Field | Description |
|-------|-------------|
| subtotal | Cart items total |
| delivery_fee | 0 or 35 |
| platform_fee | 5 |
| handling_fee | 4 |
| surge_fee | 0 or 10 |
| tip_amount | 0, 10, 20, or 30 |
| charity_amount | 0 or 2 |
| total_amount | Final order total |
| delivery_option | "standard" or "express" |
| items_in_cart | Total item count |
| addons_accepted | Count of add-ons accepted |
| addons_declined | Count of add-ons declined |
| extra_revenue | Non-product charges: delivery + surge + tip + charity + sneaked item - promo |
| sneaked_item_kept | Whether dark pattern's auto-added Dahi was still in cart |
| promo_code | Which promo code was applied (null if none) |
| promo_discount | Discount amount from promo (0 if none) |
| promo_attempts | Number of promo code attempts before checkout |

### Derived Metrics (for analysis)

| Metric | How to Calculate |
|--------|-----------------|
| **Total time to complete** | session.completed_at - session.started_at |
| **Time per screen** | screen_exit.duration_seconds |
| **Hesitation time** | Time between last cart_add/checkout interaction and place_order |
| **Total taps** | COUNT interactions WHERE event_type = 'tap' |
| **Cart value uplift** | total_amount - base_subtotal (₹669) |
| **Fee awareness** | Did user expand fee details? (fee_details_toggle event) |
| **Tip acceptance rate** | % with tip > 0 per group |
| **Charity opt-in rate** | % with charity > 0 per group |
| **Express delivery rate** | % choosing express per group |
| **Addon acceptance rate** | addons_accepted / (addons_accepted + addons_declined) |
| **Sneaked item removal** | Did dark pattern user remove the auto-added Dahi? |
| **Popup interaction** | How many popups dismissed vs accepted |
| **Extra revenue** | extra_revenue field: delivery + surge + tip + charity + sneaked item - promo |
| **Promo success rate** | % who applied a valid promo per group |
| **Promo friction** | Avg promo_attempts per group (dark has misleading codes) |
| **Device type** | Mobile vs desktop vs tablet per group |

---

## Post-Survey Questions

### Likert Scale (1-7: Strongly Disagree → Strongly Agree)

1. **Autonomy:** "I felt in control of my choices while using this app."
2. **Transparency:** "The app was transparent about all costs and fees."
3. **Pressure:** "I felt pressured to add items or services I didn't initially want."
4. **Trust:** "I trust this app to act in my best interest."
5. **Return Intent:** "I would use this app again for future purchases."
6. **Price Expectation:** "The final price matched what I expected when I started checkout."
7. **Ease of Decline:** "I found it easy to decline offers or remove unwanted items."

### Open-Ended

1. "Was there anything about the checkout experience that felt unfair or manipulative? Please describe." **(required)**
2. "If you could change one thing about this app's checkout process, what would it be?" **(required)**
3. "Any additional comments about your experience?" *(optional)*

---

## Database Schema (Supabase)

### Tables

- **participants** — Demographics + group assignment
- **sessions** — One per prototype run, tracks start/end time
- **interactions** — Every single user action (high granularity)
- **checkout_data** — Final order summary at placement
- **survey_responses** — Post-survey Likert + open-ended answers

All tables have RLS enabled with anonymous insert/select policies.

---

## Analysis Plan

### Quantitative (Independent Samples t-tests)

- Compare mean Likert scores between groups (autonomy, transparency, pressure, trust, etc.)
- Compare mean total_amount between groups
- Compare mean tip_amount, delivery_fee between groups
- Compare addon acceptance rates
- Compare time-to-complete

### Qualitative (Thematic Analysis)

- Code open-ended responses for themes
- Compare themes between groups
- Identify what users found manipulative/unfair

---

## Tech Stack

- **Framework:** Next.js 16 (App Router, Turbopack)
- **UI:** shadcn/ui + Tailwind CSS
- **State:** Zustand (persisted to localStorage)
- **Database:** Supabase (PostgreSQL)
- **Tracking:** Real-time event logging to Supabase
- **Deployment:** Vercel (recommended)

---

## Setup & Running

```bash
cd experiment
npm install
npm run dev
```

Environment variables needed in `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=https://jqoifuufghjtnwqvmmli.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
```

The app runs at `http://localhost:3000`. On desktop, the prototype renders in a centered mobile-width container (max 420px). On mobile, it's full-width.
