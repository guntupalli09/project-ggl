// src/engine/rafgsFSM.js
export const RAFGSState = Object.freeze({
  NEW: "NEW",
  CONTACTED: "CONTACTED",
  ENGAGED: "ENGAGED",
  PAUSED: "PAUSED",
  CLOSED: "CLOSED",
});

export const RAFGSEvent = Object.freeze({
  LEAD_CREATED: "LEAD_CREATED",
  OUTBOUND_SENT: "OUTBOUND_SENT",
  INBOUND_RECEIVED: "INBOUND_RECEIVED",
  TIME_ELAPSED: "TIME_ELAPSED",
  MANUAL_OVERRIDE: "MANUAL_OVERRIDE",
  TERMINATE: "TERMINATE",
});

export const RAFGS_TRANSITIONS = {
  [RAFGSState.NEW]: {
    [RAFGSEvent.LEAD_CREATED]: RAFGSState.NEW,
    [RAFGSEvent.OUTBOUND_SENT]: RAFGSState.CONTACTED,
    [RAFGSEvent.TERMINATE]: RAFGSState.CLOSED, // match docs ("ANY terminate")
  },
  [RAFGSState.CONTACTED]: {
    [RAFGSEvent.OUTBOUND_SENT]: RAFGSState.CONTACTED, // follow-ups don’t crash
    [RAFGSEvent.INBOUND_RECEIVED]: RAFGSState.ENGAGED,
    [RAFGSEvent.TIME_ELAPSED]: RAFGSState.CONTACTED,
    [RAFGSEvent.MANUAL_OVERRIDE]: RAFGSState.PAUSED,
    [RAFGSEvent.TERMINATE]: RAFGSState.CLOSED,
  },
  [RAFGSState.ENGAGED]: {
    [RAFGSEvent.MANUAL_OVERRIDE]: RAFGSState.PAUSED,
    [RAFGSEvent.TERMINATE]: RAFGSState.CLOSED,
  },
  [RAFGSState.PAUSED]: {
    [RAFGSEvent.MANUAL_OVERRIDE]: RAFGSState.CONTACTED,
    [RAFGSEvent.TERMINATE]: RAFGSState.CLOSED,
  },
  [RAFGSState.CLOSED]: {},
};

export function transitionState(currentState, event) {
  const nextState = RAFGS_TRANSITIONS?.[currentState]?.[event];
  if (!nextState) throw new Error(`Invalid RAF-GS transition: ${currentState} -> ${event}`);
  return nextState;
}
