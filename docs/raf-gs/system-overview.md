# RAF-GS — System Overview (1 Page)

RAF-GS (Response-Aware Follow-Up Gating System) is a deterministic operational
decision system governing outbound lead engagement.

## Problem
Traditional automation systems send follow-ups based on static timers, often
ignoring inbound responses and persisted engagement state.

## Solution
RAF-GS evaluates outbound eligibility using three explicit inputs:
1. Persisted lead state (FSM)
2. Time elapsed since last outbound
3. Inbound message activity

## Core Components
- Finite State Machine (rafgsFSM)
- Deterministic Decision Engine (rafgsEngine)
- Execution Adapter (workflowEngine)
- Audit Log (JSON decision records)

## Guarantees
- ENGAGED suppresses outbound actions
- PAUSED and CLOSED block automation
- Time gating enforces delay windows
- Every decision produces an auditable explanation

## Scope
RAF-GS governs decision logic only. Message delivery, scheduling, and templates
are handled by the execution layer.

**Note:** workflowEngine.ts is the authoritative implementation; workflowEngine.js is a transpiled/runtime artifact that mirrors its behavior.
