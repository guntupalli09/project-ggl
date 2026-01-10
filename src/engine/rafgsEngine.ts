// src/engine/rafgsEngine.ts
// RAF-GS Pure Decision Engine (no DB, no email, no AI, no timers)

import { RAFGSState } from "./rafgsFSM";
import { RAFGSDecision, RAFGSEvidence, RAFGSRule } from "./rafgsDecision";

export interface RAFGSEngineInput {
  currentState: RAFGSState;

  // Last outbound timestamp (if any)
  lastOutboundAt?: Date;

  // All inbound message timestamps
  inboundMessageTimes: Date[];

  // Delay rule for time-gating follow-ups
  delayMinutes: number;

  // Injected clock for determinism/testing
  now: Date;
}

/**
 * Deterministic evaluation:
 * - Block if state does not allow outreach
 * - Suppress if inbound exists after last outbound
 * - Time-gate if delay window not elapsed
 * - Otherwise eligible to SEND
 */
export function evaluateRAFGS(input: RAFGSEngineInput): RAFGSDecision {
  const now = input.now;
  const delayMinutes = input.delayMinutes;

  // 1) State block: PAUSED or CLOSED
  if (
    input.currentState === RAFGSState.PAUSED ||
    input.currentState === RAFGSState.CLOSED
  ) {
    return decision({
      action: "SKIP",
      rule: RAFGSRule.STATE_BLOCK,
      explanation: `Outreach blocked because lead state is ${input.currentState}.`,
      currentState: input.currentState,
      evidence: buildEvidence(input, {
        inboundAfterOutbound: false
      })
    });
  }

  // 2) ENGAGED: inbound response received → suppress all follow-ups
  if (input.currentState === RAFGSState.ENGAGED) {
    const latestInboundAt = latestDate(input.inboundMessageTimes);

    return decision({
      action: "SKIP",
      rule: RAFGSRule.STATE_BLOCK,
      explanation:
        "Outreach suppressed because lead is ENGAGED (inbound response received).",
      currentState: input.currentState,
      evidence: buildEvidence(input, {
        inboundAfterOutbound: true,
        latestInboundAt
      })
    });
  }

  // 3) Compute inbound-after-outbound suppression
  const lastOutboundAt = input.lastOutboundAt;
  const latestInboundAt = latestDate(input.inboundMessageTimes);

  const inboundAfterOutbound =
    !!latestInboundAt &&
    (!lastOutboundAt || latestInboundAt > lastOutboundAt);

  if (inboundAfterOutbound) {
    return decision({
      action: "SKIP",
      rule: RAFGSRule.RESPONSE_SUPPRESSION,
      explanation:
        "Follow-up suppressed because inbound response occurred after the last outbound message.",
      currentState: input.currentState,
      evidence: buildEvidence(input, {
        inboundAfterOutbound,
        latestInboundAt
      })
    });
  }

  // 4) Time gating
  if (lastOutboundAt) {
    const elapsedMs = now.getTime() - lastOutboundAt.getTime();
    const delayMs = delayMinutes * 60 * 1000;

    if (elapsedMs < delayMs) {
      const nextEligibleAt = new Date(lastOutboundAt.getTime() + delayMs);

      return decision({
        action: "SKIP",
        rule: RAFGSRule.TIME_GATE,
        explanation:
          "Delay window has not elapsed; lead is not yet eligible for follow-up.",
        currentState: input.currentState,
        evidence: buildEvidence(input, {
          inboundAfterOutbound,
          nextEligibleAt
        })
      });
    }
  }

  // 5) Eligible
  return decision({
    action: "SEND",
    rule: RAFGSRule.ELIGIBLE,
    explanation: "Lead is eligible for outreach under RAF-GS rules.",
    currentState: input.currentState,
    evidence: buildEvidence(input, {
      inboundAfterOutbound
    })
  });
}

/* -------------------- Helpers -------------------- */

function decision(d: RAFGSDecision): RAFGSDecision {
  return d;
}

function latestDate(dates: Date[]): Date | undefined {
  if (!dates || dates.length === 0) return undefined;
  return dates.reduce((max, d) => (d > max ? d : max), dates[0]);
}

function buildEvidence(
  input: RAFGSEngineInput,
  extra: {
    inboundAfterOutbound: boolean;
    latestInboundAt?: Date;
    nextEligibleAt?: Date;
  }
): RAFGSEvidence {
  const lastOutboundAt = input.lastOutboundAt;
  const latestInboundAt =
    extra.latestInboundAt ?? latestDate(input.inboundMessageTimes);

  const evidence: RAFGSEvidence = {
    now: input.now.toISOString(),
    delayMinutes: input.delayMinutes,
    inboundAfterOutbound: extra.inboundAfterOutbound
  };

  if (lastOutboundAt) {
    evidence.lastOutboundAt = lastOutboundAt.toISOString();
    evidence.timeSinceLastOutboundSeconds = Math.floor(
      (input.now.getTime() - lastOutboundAt.getTime()) / 1000
    );
  }

  if (latestInboundAt) {
    evidence.lastInboundAt = latestInboundAt.toISOString();
  }

  if (extra.nextEligibleAt) {
    evidence.nextEligibleAt = extra.nextEligibleAt.toISOString();
  } else if (lastOutboundAt) {
    const delayMs = input.delayMinutes * 60 * 1000;
    evidence.nextEligibleAt = new Date(
      lastOutboundAt.getTime() + delayMs
    ).toISOString();
  }

  return evidence;
}
