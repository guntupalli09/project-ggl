// src/engine/rafgsEngine.js
import { RAFGSState } from "./rafgsFSM.js";
import { RAFGSRule } from "./rafgsDecision.js";

function latestDate(dates) {
  if (!dates || dates.length === 0) return undefined;
  return dates.reduce((max, d) => (d > max ? d : max), dates[0]);
}

function buildEvidence(input, extra) {
  const lastOutboundAt = input.lastOutboundAt;
  const latestInboundAt = extra.latestInboundAt ?? latestDate(input.inboundMessageTimes);

  const evidence = {
    now: input.now.toISOString(),
    delayMinutes: input.delayMinutes,
    inboundAfterOutbound: extra.inboundAfterOutbound,
  };

  if (lastOutboundAt) {
    evidence.lastOutboundAt = lastOutboundAt.toISOString();
    evidence.timeSinceLastOutboundSeconds = Math.floor(
      (input.now.getTime() - lastOutboundAt.getTime()) / 1000
    );
    evidence.nextEligibleAt = new Date(lastOutboundAt.getTime() + input.delayMinutes * 60 * 1000).toISOString();
  }

  if (latestInboundAt) evidence.lastInboundAt = latestInboundAt.toISOString();
  if (extra.nextEligibleAt) evidence.nextEligibleAt = extra.nextEligibleAt.toISOString();

  return evidence;
}

export function evaluateRAFGS(input) {
  const now = input.now;

  // Blocked states
  if (input.currentState === RAFGSState.PAUSED || input.currentState === RAFGSState.CLOSED) {
    return {
      action: "SKIP",
      rule: RAFGSRule.STATE_BLOCK,
      explanation: `Outreach blocked because state is ${input.currentState}.`,
      currentState: input.currentState,
      evidence: buildEvidence(input, { inboundAfterOutbound: false }),
    };
  }

  // ENGAGED means suppress outbound
  if (input.currentState === RAFGSState.ENGAGED) {
    const latestInboundAt = latestDate(input.inboundMessageTimes);
    return {
      action: "SKIP",
      rule: RAFGSRule.STATE_BLOCK,
      explanation: "Outreach suppressed because lead is ENGAGED (inbound response received).",
      currentState: input.currentState,
      evidence: buildEvidence(input, { inboundAfterOutbound: true, latestInboundAt }),
    };
  }

  const lastOutboundAt = input.lastOutboundAt;
  const latestInboundAt = latestDate(input.inboundMessageTimes);

  const inboundAfterOutbound = !!latestInboundAt && (!lastOutboundAt || latestInboundAt > lastOutboundAt);

  if (inboundAfterOutbound) {
    return {
      action: "SKIP",
      rule: RAFGSRule.RESPONSE_SUPPRESSION,
      explanation: "Suppressed because inbound occurred after last outbound.",
      currentState: input.currentState,
      evidence: buildEvidence(input, { inboundAfterOutbound, latestInboundAt }),
    };
  }

  if (lastOutboundAt) {
    const elapsedMs = now.getTime() - lastOutboundAt.getTime();
    const delayMs = input.delayMinutes * 60 * 1000;

    if (elapsedMs < delayMs) {
      const nextEligibleAt = new Date(lastOutboundAt.getTime() + delayMs);
      return {
        action: "SKIP",
        rule: RAFGSRule.TIME_GATE,
        explanation: "Delay window has not elapsed.",
        currentState: input.currentState,
        evidence: buildEvidence(input, { inboundAfterOutbound, nextEligibleAt }),
      };
    }
  }

  return {
    action: "SEND",
    rule: RAFGSRule.ELIGIBLE,
    explanation: "Eligible for outreach under RAF-GS rules.",
    currentState: input.currentState,
    evidence: buildEvidence(input, { inboundAfterOutbound }),
  };
}
