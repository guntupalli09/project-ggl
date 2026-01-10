import { describe, it, expect } from "vitest";
import { evaluateRAFGS } from "../rafgsEngine";
import { RAFGSState } from "../rafgsFSM";
import { RAFGSRule } from "../rafgsDecision";

function d(iso: string) {
  return new Date(iso);
}

describe("RAF-GS evaluateRAFGS()", () => {
  it("NEW + no outbound -> SEND", () => {
    const res = evaluateRAFGS({
      currentState: RAFGSState.NEW,
      lastOutboundAt: undefined,
      inboundMessageTimes: [],
      delayMinutes: 10,
      now: d("2026-01-09T00:00:00.000Z")
    });

    expect(res.action).toBe("SEND");
    expect(res.rule).toBe(RAFGSRule.ELIGIBLE);
  });

  it("CONTACTED + outbound within delay -> SKIP TIME_GATE", () => {
    const res = evaluateRAFGS({
      currentState: RAFGSState.CONTACTED,
      lastOutboundAt: d("2026-01-09T00:00:00.000Z"),
      inboundMessageTimes: [],
      delayMinutes: 60,
      now: d("2026-01-09T00:30:00.000Z")
    });

    expect(res.action).toBe("SKIP");
    expect(res.rule).toBe(RAFGSRule.TIME_GATE);
    expect(res.evidence.nextEligibleAt).toBeDefined();
  });

  it("CONTACTED + inbound after outbound -> SKIP RESPONSE_SUPPRESSION", () => {
    const res = evaluateRAFGS({
      currentState: RAFGSState.CONTACTED,
      lastOutboundAt: d("2026-01-09T00:00:00.000Z"),
      inboundMessageTimes: [d("2026-01-09T00:05:00.000Z")],
      delayMinutes: 60,
      now: d("2026-01-09T00:06:00.000Z")
    });

    expect(res.action).toBe("SKIP");
    expect(res.rule).toBe(RAFGSRule.RESPONSE_SUPPRESSION);
    expect(res.evidence.inboundAfterOutbound).toBe(true);
    expect(res.evidence.lastInboundAt).toBeDefined();
  });

  it("ENGAGED -> SKIP STATE_BLOCK and includes lastInboundAt when available", () => {
    const res = evaluateRAFGS({
      currentState: RAFGSState.ENGAGED,
      lastOutboundAt: d("2026-01-09T00:00:00.000Z"),
      inboundMessageTimes: [d("2026-01-09T00:10:00.000Z")],
      delayMinutes: 60,
      now: d("2026-01-09T00:11:00.000Z")
    });

    expect(res.action).toBe("SKIP");
    expect(res.rule).toBe(RAFGSRule.STATE_BLOCK);
    expect(res.evidence.lastInboundAt).toBeDefined();
  });

  it("PAUSED -> SKIP STATE_BLOCK", () => {
    const res = evaluateRAFGS({
      currentState: RAFGSState.PAUSED,
      lastOutboundAt: d("2026-01-09T00:00:00.000Z"),
      inboundMessageTimes: [],
      delayMinutes: 60,
      now: d("2026-01-09T01:00:00.000Z")
    });

    expect(res.action).toBe("SKIP");
    expect(res.rule).toBe(RAFGSRule.STATE_BLOCK);
  });

  it("CLOSED -> SKIP STATE_BLOCK", () => {
    const res = evaluateRAFGS({
      currentState: RAFGSState.CLOSED,
      lastOutboundAt: d("2026-01-09T00:00:00.000Z"),
      inboundMessageTimes: [],
      delayMinutes: 60,
      now: d("2026-01-09T01:00:00.000Z")
    });

    expect(res.action).toBe("SKIP");
    expect(res.rule).toBe(RAFGSRule.STATE_BLOCK);
  });

  // Extra: prove determinism (same inputs => same outputs)
  it("Determinism: same inputs produce identical decision", () => {
    const input = {
      currentState: RAFGSState.CONTACTED,
      lastOutboundAt: d("2026-01-09T00:00:00.000Z"),
      inboundMessageTimes: [],
      delayMinutes: 30,
      now: d("2026-01-09T00:10:00.000Z")
    };

    const a = evaluateRAFGS(input);
    const b = evaluateRAFGS(input);

    expect(a).toEqual(b);
  });

  // Additional edge cases for comprehensive coverage
  it("CONTACTED + outbound after delay -> SEND", () => {
    const res = evaluateRAFGS({
      currentState: RAFGSState.CONTACTED,
      lastOutboundAt: d("2026-01-09T00:00:00.000Z"),
      inboundMessageTimes: [],
      delayMinutes: 30,
      now: d("2026-01-09T00:31:00.000Z")
    });

    expect(res.action).toBe("SEND");
    expect(res.rule).toBe(RAFGSRule.ELIGIBLE);
  });

  it("CONTACTED + inbound before outbound -> SEND (no suppression)", () => {
    const res = evaluateRAFGS({
      currentState: RAFGSState.CONTACTED,
      lastOutboundAt: d("2026-01-09T00:10:00.000Z"),
      inboundMessageTimes: [d("2026-01-09T00:05:00.000Z")],
      delayMinutes: 30,
      now: d("2026-01-09T00:41:00.000Z")
    });

    expect(res.action).toBe("SEND");
    expect(res.rule).toBe(RAFGSRule.ELIGIBLE);
    expect(res.evidence.inboundAfterOutbound).toBe(false);
  });
});
