# RAF-GS — Response-Aware Follow-Up Gating System

RAF-GS is a deterministic operational decision system that governs outbound
lead engagement based on explicit state, elapsed time, and inbound responses.

This documentation describes the system's formal state model and gating rules.
All execution (email, SMS, scheduling) is external to the decision engine.

## Components
- Finite State Model (`rafgsFSM.ts`)
- Deterministic Decision Engine (`rafgsEngine.ts`)
- Audit-Grade Decision Output (`rafgsDecision.ts`)

## Design Principles
- Determinism over heuristics
- Explicit state persistence
- Response-aware suppression
- Explainable, auditable decisions

## Finite State Model

 ┌────────────┐
                │    NEW     │
                └─────┬──────┘
                      │ LEAD_CREATED
                      ▼
                ┌────────────┐
                │ CONTACTED  │◄─────────────┐
                └─────┬──────┘              │
                      │                     │
        INBOUND_RECEIVED                    │ TIME_ELAPSED
                      │                     │
                      ▼                     │
                ┌────────────┐              │
                │  ENGAGED   │              │
                └─────┬──────┘              │
                      │                     │
              MANUAL_OVERRIDE               │
                      │                     │
                      ▼                     │
                ┌────────────┐              │
                │   PAUSED   │              │
                └─────┬──────┘              │
                      │                     │
                  TERMINATE                 │
                      │                     │
                      ▼                     │
                ┌────────────┐              │
                │   CLOSED   │──────────────┘
                └────────────┘
