# RAF-GS Gating Rules

## Rule 1 — State Blocking
Outbound actions are blocked if the lead is in:
- ENGAGED
- PAUSED
- CLOSED

## Rule 2 — Response-Aware Suppression
If an inbound message occurs after the most recent outbound message,
all follow-up actions are suppressed.

## Rule 3 — Time-Based Gating
Outbound follow-ups are permitted only if the configured delay window
has elapsed since the last outbound message.

## Rule 4 — Eligibility
If no blocking or suppression rule applies and the delay window has elapsed,
the lead is eligible for outbound action.
