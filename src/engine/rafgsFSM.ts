// src/engine/rafgsFSM.ts
// RAF-GS Finite State Machine
// Response-Aware Follow-Up Gating System

/**
 * RAF-GS defines lead engagement as a deterministic finite state machine.
 * State transitions are driven exclusively by observable events.
 * No side effects (DB, email, AI) are allowed in this layer.
 */

/**
 * Possible states of a lead in the RAF-GS system
 */
export enum RAFGSState {
  NEW = "NEW",
  CONTACTED = "CONTACTED",
  ENGAGED = "ENGAGED",
  PAUSED = "PAUSED",
  CLOSED = "CLOSED"
}

/**
 * Events that can cause state transitions
 */
export enum RAFGSEvent {
  LEAD_CREATED = "LEAD_CREATED",
  OUTBOUND_SENT = "OUTBOUND_SENT",
  INBOUND_RECEIVED = "INBOUND_RECEIVED",
  TIME_ELAPSED = "TIME_ELAPSED",
  MANUAL_OVERRIDE = "MANUAL_OVERRIDE",
  TERMINATE = "TERMINATE"
}

/**
 * State transition table
 * This defines all valid transitions in the system.
 * Any undefined transition is considered invalid and must be blocked.
 */
export const RAFGS_TRANSITIONS: Record<
  RAFGSState,
  Partial<Record<RAFGSEvent, RAFGSState>>
> = {
  [RAFGSState.NEW]: {
    [RAFGSEvent.LEAD_CREATED]: RAFGSState.NEW,
    [RAFGSEvent.OUTBOUND_SENT]: RAFGSState.CONTACTED
  },

  [RAFGSState.CONTACTED]: {
    [RAFGSEvent.INBOUND_RECEIVED]: RAFGSState.ENGAGED,
    [RAFGSEvent.TIME_ELAPSED]: RAFGSState.CONTACTED,
    [RAFGSEvent.MANUAL_OVERRIDE]: RAFGSState.PAUSED,
    [RAFGSEvent.TERMINATE]: RAFGSState.CLOSED
  },

  [RAFGSState.ENGAGED]: {
    [RAFGSEvent.MANUAL_OVERRIDE]: RAFGSState.PAUSED,
    [RAFGSEvent.TERMINATE]: RAFGSState.CLOSED
  },

  [RAFGSState.PAUSED]: {
    [RAFGSEvent.MANUAL_OVERRIDE]: RAFGSState.CONTACTED,
    [RAFGSEvent.TERMINATE]: RAFGSState.CLOSED
  },

  [RAFGSState.CLOSED]: {
    // Terminal state — no transitions allowed
  }
};

/**
 * Evaluate a state transition.
 * Returns the next state if valid, otherwise throws an error.
 *
 * This function is intentionally strict to preserve determinism.
 */
export function transitionState(
  currentState: RAFGSState,
  event: RAFGSEvent
): RAFGSState {
  const nextState = RAFGS_TRANSITIONS[currentState]?.[event];

  if (!nextState) {
    throw new Error(
      `Invalid RAF-GS transition: ${currentState} -> ${event}`
    );
  }

  return nextState;
}

/**
 * Utility function for safe transition checks.
 * Returns null instead of throwing.
 */
export function canTransition(
  currentState: RAFGSState,
  event: RAFGSEvent
): RAFGSState | null {
  return RAFGS_TRANSITIONS[currentState]?.[event] ?? null;
}

/**
 * Human-readable explanation for states
 * (Used in audit logs and expert documentation)
 */
export const RAFGS_STATE_DESCRIPTIONS: Record<RAFGSState, string> = {
  [RAFGSState.NEW]:
    "Lead has been created but no outbound contact has been sent.",

  [RAFGSState.CONTACTED]:
    "At least one outbound message has been sent; awaiting response or time-based follow-up.",

  [RAFGSState.ENGAGED]:
    "Inbound response received after outbound contact; follow-ups are suppressed.",

  [RAFGSState.PAUSED]:
    "Lead engagement has been manually paused to prevent automated actions.",

  [RAFGSState.CLOSED]:
    "Lead lifecycle has been terminated; no further actions are permitted."
};
