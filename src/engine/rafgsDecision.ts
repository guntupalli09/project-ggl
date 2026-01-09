// src/engine/rafgsDecision.ts
// RAF-GS Decision Schema (pure data structures, no side effects)

import { RAFGSState } from "./rafgsFSM";

export enum RAFGSRule {
  STATE_BLOCK = "STATE_BLOCK",
  RESPONSE_SUPPRESSION = "RESPONSE_SUPPRESSION",
  TIME_GATE = "TIME_GATE",
  ELIGIBLE = "ELIGIBLE"
}

export interface RAFGSEvidence {
  now: string;
  delayMinutes: number;
  lastOutboundAt?: string;
  lastInboundAt?: string;
  inboundAfterOutbound: boolean;
  timeSinceLastOutboundSeconds?: number;
  nextEligibleAt?: string;
}

export interface RAFGSDecision {
  action: "SEND" | "SKIP";
  rule: RAFGSRule;
  explanation: string;
  currentState: RAFGSState;
  evidence: RAFGSEvidence;
}
