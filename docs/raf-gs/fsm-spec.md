# RAF-GS Finite State Model Specification

## States
- NEW: Lead created, no outbound contact
- CONTACTED: Outbound contact sent, awaiting response or time eligibility
- ENGAGED: Inbound response received; outbound suppressed
- PAUSED: Manual suspension of automation
- CLOSED: Terminal state

## Events
- OUTBOUND_SENT
- INBOUND_RECEIVED
- TIME_ELAPSED
- MANUAL_OVERRIDE
- TERMINATE

## Transition Rules
| Current State | Event             | Next State |
|---------------|------------------|------------|
| NEW           | OUTBOUND_SENT     | CONTACTED |
| CONTACTED     | INBOUND_RECEIVED  | ENGAGED   |
| CONTACTED     | TIME_ELAPSED      | CONTACTED |
| ENGAGED       | MANUAL_OVERRIDE   | PAUSED    |
| PAUSED        | MANUAL_OVERRIDE   | CONTACTED |
| ANY           | TERMINATE         | CLOSED    |

## Invariants
- ENGAGED state suppresses all outbound actions
- CLOSED is terminal
- Undefined transitions are rejected
