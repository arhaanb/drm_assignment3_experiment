# Insights Page — Context & Guide

## Purpose

The `/insights` page is a **public, presentation-ready** summary of the experiment findings. It's designed to be shown during the DRM final presentation and shared with the course instructor. Unlike `/admin` (raw data, password-protected), this page presents **aggregated analysis** with proper statistical testing.

## What it shows

### 1. Sample Demographics
- Pie charts: gender, occupation, app usage frequency, device type
- Total N and group allocation counts

### 2. Survey Score Overview
- Grouped bar chart comparing all 7 Likert items between dark pattern and ethical groups
- Neutral midpoint reference line (4 on 7-point scale)

### 3. Hypothesis Testing

**H1: Perceived Autonomy**
- IV: Prototype type (dark pattern vs ethical)
- DV: Autonomy-related survey items (q_autonomy, q_ease_of_decline)
- Test: Welch's independent samples t-test
- Expected: Dark pattern group reports lower autonomy

**H2: Perceived Manipulation & Trust**
- IV: Prototype type
- DV: Manipulation/trust items (q_pressure, q_transparency, q_trust, q_return_intent)
- Test: Welch's t-test per item
- Expected: Dark pattern group reports higher pressure, lower trust/transparency/return intent

**H3: Revenue Impact**
- IV: Prototype type
- DV: Cart total (Rs.)
- Test: Welch's t-test
- Tested on `extra_revenue` (non-product charges), NOT raw totals — this controls for users adding/removing products
- Expected: Dark pattern generates higher extra charges due to hidden fees, pre-selected tips, sneaked items
- Raw order totals shown as secondary reference only

### 4. Behavioral Evidence
- Table showing % of each group who:
  - Chose express delivery (pre-selected in dark, not in ethical)
  - Kept the pre-selected tip
  - Donated to charity (pre-checked in dark, explicit opt-in in ethical)
  - Accepted add-on suggestions

### 5. Time per Screen
- Grouped bar chart showing average seconds on cart, addons, checkout, etc.
- Hypothesis: dark pattern users may spend more time on checkout (confusion/fee review) or less time (urgency pressure)

### 6. Qualitative Responses
- Side-by-side display of open-ended answers from both groups:
  - "What felt unfair?"
  - "What would you change?"
  - "Additional comments"
- Useful for thematic analysis in the report

### 7. Methodology Note
- Study design, prototype description, measures, and analysis methods

## Statistical Notes

- All t-tests use **Welch's t-test** (unequal variance assumption) — appropriate for small, potentially unequal sample sizes
- p < 0.05 threshold marked with a green badge; non-significant results shown transparently
- With the target N of 20-30, some effects may not reach significance — the page auto-generates appropriate contextual notes
- Mean ± SD reported alongside n for each group

## How to use for the presentation

1. Open `/insights` in a browser tab
2. Use the sticky nav bar to jump between sections
3. The page fetches live data from Supabase — always up to date
4. Screenshots of charts can be used in slides
5. The statistical tables (M ± SD, t, df, p) can be directly cited in the report

## DV → Survey Question Mapping

| DV | Survey Key | Question Text |
|---|---|---|
| Perceived Autonomy | q_autonomy | "I felt in control of my choices while using this app" |
| Transparency | q_transparency | "The app was transparent about all costs and fees" |
| Perceived Pressure | q_pressure | "I felt pressured to make purchases I didn't intend to" |
| Trust | q_trust | "I would trust this app with my regular grocery orders" |
| Return Intent | q_return_intent | "I would use this app again in the future" |
| Price Fairness | q_price_expectation | "The final price matched what I expected" |
| Ease of Decline | q_ease_of_decline | "It was easy to decline or remove unwanted options" |
